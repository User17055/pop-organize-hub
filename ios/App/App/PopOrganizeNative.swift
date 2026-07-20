import Foundation
import UIKit
import SwiftUI
import AuthenticationServices
import UserNotifications
import AVFoundation

// MARK: - Domain

enum PopThemeMode: String, Codable, CaseIterable, Identifiable {
    case light
    case dark

    var id: String { rawValue }
    var title: String { self == .light ? "Tema claro" : "Tema escuro" }
    var scheme: ColorScheme { self == .light ? .light : .dark }
}

enum WorkspaceKind: String, Codable {
    case personal
    case company
}

enum PopPriority: String, Codable, CaseIterable, Identifiable {
    case low = "Baixa"
    case medium = "Média"
    case high = "Alta"
    case urgent = "Urgente"

    var id: String { rawValue }
    var color: Color {
        switch self {
        case .low: return Color(hex: 0x18A66A)
        case .medium: return Color(hex: 0xFF9F1C)
        case .high, .urgent: return Color(hex: 0xE5484D)
        }
    }
}

enum AssignmentKind: String, Codable {
    case none
    case person
    case sector
    case group
}

struct AssignmentTarget: Codable, Hashable {
    var kind: AssignmentKind = .none
    var id: UUID?
    var label: String = "Sem responsável"

    static let none = AssignmentTarget()
}

struct UserProfile: Codable, Identifiable {
    var id: String
    var name: String
    var email: String
    var avatarURL: String?

    var firstName: String {
        name.split(separator: " ").first.map(String.init) ?? name
    }
}

struct CompanyMember: Codable, Identifiable, Hashable {
    var id = UUID()
    var name: String
    var email: String
    var role: String
    var sector: String
}

struct CompanySector: Codable, Identifiable, Hashable {
    var id = UUID()
    var name: String
    var detail: String
}

struct CompanyGroup: Codable, Identifiable, Hashable {
    var id = UUID()
    var name: String
    var detail: String
}

struct CompanyWorkspace: Codable, Identifiable, Hashable {
    var id = UUID()
    var name: String
    var detail: String
    var members: [CompanyMember] = []
    var sectors: [CompanySector] = []
    var groups: [CompanyGroup] = []
}

struct PopTask: Codable, Identifiable, Hashable {
    var id = UUID()
    var title: String
    var detail: String
    var dueDate: Date
    var priority: PopPriority
    var isCompleted = false
    var workspace: WorkspaceKind = .personal
    var companyID: UUID?
    var assignment: AssignmentTarget = .none
    var createdAt = Date()
}

private struct PersistedState: Codable {
    var user: UserProfile?
    var guestMode: Bool
    var workspace: WorkspaceKind
    var selectedCompanyID: UUID?
    var companies: [CompanyWorkspace]
    var tasks: [PopTask]
}

// MARK: - API prepared for the VPS

struct AppleLoginRequest: Codable {
    var identityToken: String
    var authorizationCode: String?
    var appleUserID: String
    var name: String?
    var email: String?
}

private struct NativeLoginResponse: Codable {
    var user: UserProfile
}

enum PopAPIError: LocalizedError {
    case notConfigured
    case invalidResponse
    case server(String)

    var errorDescription: String? {
        switch self {
        case .notConfigured: return "A URL da VPS ainda não foi configurada."
        case .invalidResponse: return "A VPS devolveu uma resposta inválida."
        case .server(let message): return message
        }
    }
}

final class PopAPIClient {
    static let shared = PopAPIClient()

    private var baseURL: URL? {
        guard
            let raw = Bundle.main.object(forInfoDictionaryKey: "POP_API_BASE_URL") as? String,
            !raw.isEmpty,
            !raw.contains("example")
        else { return nil }
        guard let url = URL(string: raw), url.scheme == "https", url.host != nil else { return nil }
        return url
    }

    var isConfigured: Bool { baseURL != nil }

    func signInWithApple(_ payload: AppleLoginRequest) async throws -> UserProfile {
        guard let baseURL else { throw PopAPIError.notConfigured }
        var request = URLRequest(url: baseURL.appendingPathComponent("api/native/auth/apple"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(payload)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw PopAPIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "Falha ao entrar pela VPS."
            throw PopAPIError.server(message)
        }
        return try JSONDecoder().decode(NativeLoginResponse.self, from: data).user
    }
}

// MARK: - Store

@MainActor
final class PopStore: ObservableObject {
    @Published var currentUser: UserProfile? { didSet { persist() } }
    @Published var guestMode = false { didSet { persist() } }
    @Published var workspace: WorkspaceKind = .personal { didSet { persist() } }
    @Published var selectedCompanyID: UUID? { didSet { persist() } }
    @Published var companies: [CompanyWorkspace] = [] { didSet { persist() } }
    @Published var tasks: [PopTask] = [] { didSet { persistAndSchedule() } }
    @Published var syncMessage = "Dados salvos neste iPhone"
    @Published var deletingTaskID: UUID?

    private let storageKey = "pop-organize-ios-native-state-v1"
    private var isRestoring = true

    init() {
        if
            let data = UserDefaults.standard.data(forKey: storageKey),
            let state = try? JSONDecoder().decode(PersistedState.self, from: data)
        {
            currentUser = state.user
            guestMode = state.guestMode
            workspace = state.workspace
            selectedCompanyID = state.selectedCompanyID
            companies = state.companies
            tasks = state.tasks
        } else {
            currentUser = nil
            tasks = [
                PopTask(
                    title: "Planejar minha semana",
                    detail: "Revisar prioridades e organizar os próximos dias.",
                    dueDate: Calendar.current.date(bySettingHour: 18, minute: 0, second: 0, of: Date()) ?? Date(),
                    priority: .high
                ),
                PopTask(
                    title: "Organizar documentos",
                    detail: "Separar os documentos importantes.",
                    dueDate: Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date(),
                    priority: .medium
                )
            ]
        }
        isRestoring = false
        persistAndSchedule()
    }

    var isSignedIn: Bool { currentUser != nil || guestMode }

    var selectedCompany: CompanyWorkspace? {
        guard let selectedCompanyID else { return nil }
        return companies.first(where: { $0.id == selectedCompanyID })
    }

    var visibleTasks: [PopTask] {
        switch workspace {
        case .personal:
            return tasks.filter { $0.workspace == .personal }
        case .company:
            guard let selectedCompanyID else { return [] }
            return tasks.filter { $0.workspace == .company && $0.companyID == selectedCompanyID }
        }
    }

    func continueAsGuest() {
        guestMode = true
        currentUser = nil
        workspace = .personal
    }

    func signOut() {
        currentUser = nil
        guestMode = false
        workspace = .personal
        selectedCompanyID = nil
    }

    func handleAppleAuthorization(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .failure(let error):
            syncMessage = error.localizedDescription
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
                syncMessage = "Não foi possível ler a conta Apple."
                return
            }
            let previous = currentUser
            let fullName = PersonNameComponentsFormatter().string(from: credential.fullName ?? PersonNameComponents())
            let localUser = UserProfile(
                id: credential.user,
                name: fullName.isEmpty ? (previous?.name ?? "Usuário Apple") : fullName,
                email: credential.email ?? previous?.email ?? "E-mail privado da Apple",
                avatarURL: nil
            )
            currentUser = localUser
            guestMode = false
            syncMessage = PopAPIClient.shared.isConfigured ? "Conectando à VPS…" : "Conta Apple validada neste iPhone"

            guard let tokenData = credential.identityToken else { return }
            let payload = AppleLoginRequest(
                identityToken: String(data: tokenData, encoding: .utf8) ?? tokenData.base64EncodedString(),
                authorizationCode: credential.authorizationCode.flatMap { String(data: $0, encoding: .utf8) },
                appleUserID: credential.user,
                name: fullName.isEmpty ? nil : fullName,
                email: credential.email
            )
            Task {
                do {
                    currentUser = try await PopAPIClient.shared.signInWithApple(payload)
                    syncMessage = "Sincronizado com a VPS"
                } catch PopAPIError.notConfigured {
                    syncMessage = "Conta Apple validada • aguardando a VPS"
                } catch {
                    syncMessage = "Conta validada; sincronização pendente"
                }
            }
        }
    }

    func selectPersonalWorkspace() { workspace = .personal }

    func selectCompany(_ company: CompanyWorkspace) {
        selectedCompanyID = company.id
        workspace = .company
    }

    func createCompany(name: String, detail: String) {
        var company = CompanyWorkspace(name: name, detail: detail)
        if let user = currentUser {
            company.members.append(
                CompanyMember(name: user.name, email: user.email, role: "Administrador", sector: "Direção")
            )
        }
        companies.append(company)
        selectCompany(company)
    }

    func updateCompany(_ company: CompanyWorkspace) {
        guard let index = companies.firstIndex(where: { $0.id == company.id }) else { return }
        companies[index] = company
    }

    func addTask(_ task: PopTask) {
        withAnimation(.spring(response: 0.42, dampingFraction: 0.78)) {
            tasks.insert(task, at: 0)
        }
        ActionSound.shared.play()
    }

    func toggle(_ task: PopTask) {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        withAnimation(.spring(response: 0.48, dampingFraction: 0.7)) {
            tasks[index].isCompleted.toggle()
        }
        ActionSound.shared.play()
    }

    func delete(_ task: PopTask) {
        deletingTaskID = task.id
        ActionSound.shared.play()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.34) {
            withAnimation(.easeInOut(duration: 0.28)) {
                self.tasks.removeAll(where: { $0.id == task.id })
                self.deletingTaskID = nil
            }
        }
    }

    private func persistAndSchedule() {
        persist()
        guard !isRestoring else { return }
        NotificationCoordinator.shared.schedule(tasks: tasks, firstName: currentUser?.firstName ?? "você")
    }

    private func persist() {
        guard !isRestoring else { return }
        let state = PersistedState(
            user: currentUser,
            guestMode: guestMode,
            workspace: workspace,
            selectedCompanyID: selectedCompanyID,
            companies: companies,
            tasks: tasks
        )
        if let data = try? JSONEncoder().encode(state) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }
}

// MARK: - Notifications and sound

final class ActionSound {
    static let shared = ActionSound()
    private var player: AVAudioPlayer?

    func play() {
        guard let url = Bundle.main.url(forResource: "pop_notification", withExtension: "mp3") else { return }
        player = try? AVAudioPlayer(contentsOf: url)
        player?.prepareToPlay()
        player?.play()
    }
}

final class NotificationCoordinator: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationCoordinator()
    private let center = UNUserNotificationCenter.current()

    func configure() {
        center.delegate = self
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            guard granted else { return }
            DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() }
        }
    }

    func storeRemoteDeviceToken(_ data: Data) {
        let token = data.map { String(format: "%02x", $0) }.joined()
        UserDefaults.standard.set(token, forKey: "pop-organize-apns-device-token")
    }

    func clearBadge() {
        UIApplication.shared.applicationIconBadgeNumber = 0
        center.removeAllDeliveredNotifications()
    }

    func schedule(tasks: [PopTask], firstName: String) {
        let pending = tasks.filter { !$0.isCompleted }
        UIApplication.shared.applicationIconBadgeNumber = pending.count
        let identifiers = ["pop-morning", "pop-afternoon", "pop-evening"] + tasks.map { "pop-task-\($0.id.uuidString)" }
        center.removePendingNotificationRequests(withIdentifiers: identifiers)
        guard !pending.isEmpty else { return }

        let calendar = Calendar.current
        let todayCount = pending.filter { calendar.isDateInToday($0.dueDate) }.count
        let overdueCount = pending.filter { $0.dueDate < Date() }.count
        let summary = overdueCount > 0
            ? "Você ainda tem \(overdueCount) tarefa\(overdueCount == 1 ? "" : "s") atrasada\(overdueCount == 1 ? "" : "s")."
            : "Você tem \(pending.count) tarefa\(pending.count == 1 ? "" : "s") pendente\(pending.count == 1 ? "" : "s")."

        scheduleDaily(
            id: "pop-morning",
            hour: 8,
            title: "Bom dia, \(firstName)",
            body: todayCount == 0 ? summary : "Hoje temos \(todayCount) tarefa\(todayCount == 1 ? "" : "s"). Vamos organizar o dia?",
            badge: pending.count
        )
        scheduleDaily(id: "pop-afternoon", hour: 14, title: "Boa tarde, \(firstName)", body: summary, badge: pending.count)
        scheduleDaily(id: "pop-evening", hour: 19, title: "Boa noite, \(firstName)", body: summary, badge: pending.count)

        for task in pending where task.dueDate > Date() {
            let content = content(
                title: "Prazo da tarefa",
                body: "\(task.title) chegou ao horário definido.",
                badge: pending.count
            )
            let trigger = UNCalendarNotificationTrigger(
                dateMatching: calendar.dateComponents([.year, .month, .day, .hour, .minute], from: task.dueDate),
                repeats: false
            )
            center.add(UNNotificationRequest(identifier: "pop-task-\(task.id.uuidString)", content: content, trigger: trigger))
        }
    }

    private func scheduleDaily(id: String, hour: Int, title: String, body: String, badge: Int) {
        let trigger = UNCalendarNotificationTrigger(dateMatching: DateComponents(hour: hour, minute: 0), repeats: true)
        center.add(UNNotificationRequest(identifier: id, content: content(title: title, body: body, badge: badge), trigger: trigger))
    }

    private func content(title: String, body: String, badge: Int) -> UNMutableNotificationContent {
        let value = UNMutableNotificationContent()
        value.title = title
        value.body = body
        value.sound = UNNotificationSound(named: UNNotificationSoundName(rawValue: "pop_notification.mp3"))
        value.badge = NSNumber(value: max(badge, 1))
        return value
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([])
    }
}

// MARK: - Design system

extension Color {
    init(hex: UInt, alpha: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: alpha
        )
    }
}

enum PopPalette {
    static let blue = Color(hex: 0x1687F8)
    static let blueDark = Color(hex: 0x075AB6)
    static let green = Color(hex: 0x18A66A)
    static let orange = Color(hex: 0xFF9F1C)
    static let red = Color(hex: 0xE5484D)

    static func background(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0x0D1110) : Color(hex: 0xF4F7FB)
    }

    static func surface(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0x191D1C) : Color.white
    }

    static func surfaceAlt(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0x242928) : Color(hex: 0xEAF0F6)
    }

    static func text(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? .white : Color(hex: 0x111923)
    }

    static func muted(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color.white.opacity(0.58) : Color(hex: 0x657383)
    }
}

struct PopLogo: View {
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        HStack(spacing: 0) {
            Text("P")
            Circle().fill(PopPalette.blue).frame(width: 17, height: 17).padding(.horizontal, 1)
            Text("p Organize")
        }
        .font(.custom("Poppins-Bold", size: 24))
        .foregroundColor(PopPalette.text(scheme))
        .accessibilityLabel("Pop Organize")
    }
}

struct PopCard<Content: View>: View {
    @Environment(\.colorScheme) private var scheme
    let content: Content

    init(@ViewBuilder content: () -> Content) { self.content = content() }

    var body: some View {
        content
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(PopPalette.surface(scheme))
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}

struct PrimaryButton: View {
    var title: String
    var icon: String? = nil
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Text(title).fontWeight(.bold)
                if let icon { Image(systemName: icon) }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .foregroundColor(.white)
            .background(PopPalette.blue)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Root and onboarding

struct PopNativeRootView: View {
    @EnvironmentObject private var store: PopStore
    @AppStorage("pop-ios-onboarding-complete") private var onboardingComplete = false
    @AppStorage("pop-ios-theme") private var themeRaw = PopThemeMode.dark.rawValue

    private var theme: PopThemeMode { PopThemeMode(rawValue: themeRaw) ?? .dark }

    var body: some View {
        Group {
            if !onboardingComplete {
                OnboardingView { onboardingComplete = true }
            } else if !store.isSignedIn {
                LoginView()
            } else {
                MainTabView(themeRaw: $themeRaw)
            }
        }
        .preferredColorScheme(theme.scheme)
        .onAppear { NotificationCoordinator.shared.configure() }
    }
}

private struct OnboardingItem: Identifiable {
    let id = UUID()
    let title: String
    let highlighted: String
    let detail: String
    let symbol: String
}

struct OnboardingView: View {
    @Environment(\.colorScheme) private var scheme
    @State private var page = 0
    let onFinish: () -> Void

    private let items = [
        OnboardingItem(title: "Organize tudo em um só lugar", highlighted: "tudo", detail: "Crie tarefas, defina prazos e acompanhe suas atividades com facilidade.", symbol: "checklist"),
        OnboardingItem(title: "Trabalhe junto com sua equipe", highlighted: "equipe", detail: "Distribua atividades entre empresas, setores, grupos e colaboradores.", symbol: "person.3.fill"),
        OnboardingItem(title: "Acompanhe cada etapa", highlighted: "etapa", detail: "Receba lembretes e nunca deixe um prazo passar despercebido.", symbol: "bell.badge.fill")
    ]

    var body: some View {
        ZStack {
            Color(hex: 0x2C2C2C).ignoresSafeArea()
            VStack(spacing: 20) {
                PopLogo().environment(\.colorScheme, .dark).padding(.top, 12)
                TabView(selection: $page) {
                    ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                        VStack(spacing: 30) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 54, style: .continuous)
                                    .fill(Color.white)
                                    .frame(width: 230, height: 230)
                                    .rotationEffect(.degrees(index == 0 ? -3 : 2))
                                Circle().fill(PopPalette.blue.opacity(0.12)).frame(width: 110, height: 110).offset(x: -48, y: -46)
                                RoundedRectangle(cornerRadius: 32, style: .continuous)
                                    .fill(Color(hex: 0x292D30))
                                    .frame(width: 125, height: 125)
                                    .shadow(color: .black.opacity(0.24), radius: 18, y: 12)
                                Image(systemName: item.symbol)
                                    .font(.system(size: 56, weight: .medium))
                                    .foregroundColor(PopPalette.blue)
                            }
                            Text(item.title)
                                .font(.custom("Poppins-Bold", size: 31))
                                .multilineTextAlignment(.center)
                                .foregroundColor(.white)
                            Text(item.detail)
                                .font(.system(size: 15, weight: .medium))
                                .multilineTextAlignment(.center)
                                .foregroundColor(.white.opacity(0.6))
                                .padding(.horizontal, 24)
                        }
                        .tag(index)
                    }
                }
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .always))
                HStack(spacing: 12) {
                    Button(page == 0 ? "Pular" : "Voltar") {
                        if page == 0 { onFinish() } else { withAnimation { page -= 1 } }
                    }
                    .frame(maxWidth: .infinity).frame(height: 54)
                    .background(Color.white.opacity(0.1)).foregroundColor(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

                    PrimaryButton(title: page == items.count - 1 ? "Começar" : "Próximo", icon: "arrow.right") {
                        if page == items.count - 1 { onFinish() } else { withAnimation { page += 1 } }
                    }
                }
                .padding(.horizontal, 24).padding(.bottom, 12)
            }
        }
    }
}

struct LoginView: View {
    @EnvironmentObject private var store: PopStore
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        ZStack {
            Color(hex: 0x2C2C2C).ignoresSafeArea()
            VStack(spacing: 24) {
                PopLogo().environment(\.colorScheme, .dark).padding(.top, 12)
                Spacer()
                ZStack {
                    Circle().fill(Color.white).frame(width: 205, height: 205)
                    RoundedRectangle(cornerRadius: 28, style: .continuous)
                        .fill(Color(hex: 0x292D30)).frame(width: 126, height: 126)
                    Image(systemName: "checklist").font(.system(size: 58)).foregroundColor(PopPalette.blue)
                }
                Text("Organize tudo.")
                    .font(.custom("Poppins-Bold", size: 38)).foregroundColor(.white)
                Text("Pessoas, tarefas e equipes em um só lugar, de um jeito simples.")
                    .multilineTextAlignment(.center).foregroundColor(.white.opacity(0.58)).padding(.horizontal, 34)
                Spacer()
                SignInWithAppleButton(.continue) { request in
                    request.requestedScopes = [.fullName, .email]
                } onCompletion: { result in
                    store.handleAppleAuthorization(result)
                }
                .signInWithAppleButtonStyle(.white)
                .frame(height: 54)
                .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))

                Button("Continuar sem login") { store.continueAsGuest() }
                    .fontWeight(.bold)
                    .frame(maxWidth: .infinity).frame(height: 54)
                    .foregroundColor(Color(hex: 0x191919)).background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
                Text(store.syncMessage).font(.caption).foregroundColor(.white.opacity(0.48))
            }
            .padding(.horizontal, 28).padding(.bottom, 24)
        }
    }
}

// MARK: - Main navigation and workspace

enum MainTab: Hashable {
    case dashboard
    case tasks
    case calendar
    case more
}

struct MainTabView: View {
    @EnvironmentObject private var store: PopStore
    @Binding var themeRaw: String
    @State private var selectedTab: MainTab = .dashboard

    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView(openTasks: { selectedTab = .tasks })
                .tabItem { Label("Início", systemImage: "house.fill") }.tag(MainTab.dashboard)
            TasksView()
                .tabItem { Label("Tarefas", systemImage: "checkmark.circle") }.tag(MainTab.tasks)
            CalendarView()
                .tabItem { Label("Calendário", systemImage: "calendar") }.tag(MainTab.calendar)
            MoreView(themeRaw: $themeRaw)
                .tabItem { Label("Mais", systemImage: "ellipsis") }.tag(MainTab.more)
        }
        .accentColor(PopPalette.blue)
    }
}

struct WorkspaceHeader: View {
    @EnvironmentObject private var store: PopStore
    @Environment(\.colorScheme) private var scheme
    @State private var showCreateCompany = false

    var title: String {
        if store.workspace == .personal { return "Meu espaço" }
        return store.selectedCompany?.name ?? "Minha empresa"
    }

    var body: some View {
        HStack(alignment: .top) {
            Menu {
                Button { store.selectPersonalWorkspace() } label: {
                    Label("Meu espaço", systemImage: store.workspace == .personal ? "checkmark" : "person")
                }
                if !store.companies.isEmpty { Divider() }
                ForEach(store.companies) { company in
                    Button { store.selectCompany(company) } label: {
                        Label(company.name, systemImage: store.selectedCompanyID == company.id ? "checkmark" : "building.2")
                    }
                }
                Divider()
                Button { showCreateCompany = true } label: { Label("Criar minha empresa", systemImage: "plus") }
            } label: {
                HStack(spacing: 7) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(title).font(.custom("Poppins-Bold", size: 27))
                        if store.workspace == .company, let detail = store.selectedCompany?.detail {
                            Text(detail).font(.caption).foregroundColor(PopPalette.muted(scheme)).lineLimit(1)
                        }
                    }
                    Image(systemName: "chevron.down").font(.system(size: 15, weight: .bold)).foregroundColor(PopPalette.blue)
                }
                .foregroundColor(PopPalette.text(scheme))
            }
            Spacer()
            PopLogo().scaleEffect(0.78, anchor: .trailing)
        }
        .padding(.horizontal, 20).padding(.top, 12).padding(.bottom, 10)
        .sheet(isPresented: $showCreateCompany) { CompanyEditorView() }
    }
}

// MARK: - Dashboard

struct DashboardView: View {
    @EnvironmentObject private var store: PopStore
    @Environment(\.colorScheme) private var scheme
    let openTasks: () -> Void

    private var pending: [PopTask] { store.visibleTasks.filter { !$0.isCompleted } }
    private var completed: [PopTask] { store.visibleTasks.filter(\.isCompleted) }
    private var today: [PopTask] { pending.filter { Calendar.current.isDateInToday($0.dueDate) } }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        let prefix = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"
        return "\(prefix), \(store.currentUser?.firstName ?? "você")"
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 18) {
                    WorkspaceHeader()
                    VStack(alignment: .leading, spacing: 22) {
                        Text(greeting).font(.title3.bold()).foregroundColor(.white.opacity(0.86))
                        Text(today.isEmpty ? "Nenhuma tarefa\npara hoje" : "Hoje temos \(today.count)\ntarefa\(today.count == 1 ? "" : "s")")
                            .font(.custom("Poppins-Bold", size: 38)).foregroundColor(.white)
                        Button(action: openTasks) {
                            Label(today.isEmpty ? "Começar agora" : "Ver tarefas", systemImage: "arrow.right")
                                .fontWeight(.bold).padding(.horizontal, 18).frame(height: 50)
                                .background(Color.white.opacity(0.16)).clipShape(RoundedRectangle(cornerRadius: 16))
                        }.buttonStyle(.plain).foregroundColor(.white)
                    }
                    .padding(24).frame(maxWidth: .infinity, alignment: .leading)
                    .background(LinearGradient(colors: [Color(hex: 0x3DAAF8), Color(hex: 0x0874EA)], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .clipShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
                    .padding(.horizontal, 20)

                    HStack {
                        Text("Visão geral").font(.title2.bold())
                        Spacer()
                        Text("\(store.visibleTasks.count) tarefas").foregroundColor(PopPalette.muted(scheme))
                    }.padding(.horizontal, 20)
                    HStack(spacing: 12) {
                        MetricCard(title: "Concluídas", value: completed.count, total: store.visibleTasks.count, color: PopPalette.green)
                        MetricCard(title: "Pendentes", value: pending.count, total: store.visibleTasks.count, color: PopPalette.orange)
                    }.padding(.horizontal, 20)

                    HStack {
                        Text("Tarefas recentes").font(.title2.bold())
                        Spacer()
                        Button("Ver todas", action: openTasks).fontWeight(.bold)
                    }.padding(.horizontal, 20)
                    if store.visibleTasks.isEmpty {
                        PopCard {
                            Text("Seu espaço está organizado.").fontWeight(.bold)
                            Text("Crie uma tarefa para começar.").foregroundColor(PopPalette.muted(scheme)).font(.subheadline)
                        }.padding(.horizontal, 20)
                    } else {
                        VStack(spacing: 10) {
                            ForEach(store.visibleTasks.prefix(3)) { task in TaskRow(task: task) }
                        }.padding(.horizontal, 20)
                    }
                }.padding(.bottom, 24)
            }
            .background(PopPalette.background(scheme).ignoresSafeArea())
            .navigationBarHidden(true)
        }.navigationViewStyle(StackNavigationViewStyle())
    }
}

struct MetricCard: View {
    @Environment(\.colorScheme) private var scheme
    let title: String
    let value: Int
    let total: Int
    let color: Color

    var body: some View {
        PopCard {
            VStack(alignment: .leading, spacing: 16) {
                Text(title).font(.headline)
                HStack(alignment: .lastTextBaseline) {
                    Text("\(value)").font(.custom("Poppins-Bold", size: 38)).foregroundColor(color)
                    Spacer()
                    Text(total == 0 ? "0%" : "\(Int(Double(value) / Double(total) * 100))%")
                        .font(.headline).foregroundColor(PopPalette.muted(scheme))
                }
                GeometryReader { proxy in
                    ZStack(alignment: .leading) {
                        Capsule().fill(PopPalette.surfaceAlt(scheme))
                        Capsule().fill(color).frame(width: proxy.size.width * CGFloat(total == 0 ? 0 : Double(value) / Double(total)))
                    }
                }.frame(height: 7)
            }
        }
    }
}

// MARK: - Tasks

struct TasksView: View {
    @EnvironmentObject private var store: PopStore
    @Environment(\.colorScheme) private var scheme
    @State private var query = ""
    @State private var showCreate = false
    @State private var selectedTask: PopTask?
    @State private var showCompleted = false

    private var filtered: [PopTask] {
        store.visibleTasks.filter { query.isEmpty || $0.title.localizedCaseInsensitiveContains(query) || $0.detail.localizedCaseInsensitiveContains(query) }
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                WorkspaceHeader()
                ScrollView {
                    LazyVStack(spacing: 11) {
                        let pending = filtered.filter { !$0.isCompleted }
                        if pending.isEmpty {
                            PopCard {
                                Text("Nenhuma tarefa pendente").fontWeight(.bold)
                                Text("Tudo organizado por aqui.").font(.subheadline).foregroundColor(PopPalette.muted(scheme))
                            }
                        } else {
                            ForEach(pending) { task in
                                TaskRow(task: task).onTapGesture { selectedTask = task }
                                    .transition(.asymmetric(insertion: .move(edge: .top).combined(with: .opacity), removal: .scale.combined(with: .opacity)))
                            }
                        }
                        if !filtered.filter(\.isCompleted).isEmpty {
                            Button {
                                withAnimation(.easeInOut(duration: 0.3)) { showCompleted.toggle() }
                            } label: {
                                HStack {
                                    Text("Concluídas").fontWeight(.bold)
                                    Spacer()
                                    Text("\(filtered.filter(\.isCompleted).count)").foregroundColor(PopPalette.muted(scheme))
                                    Image(systemName: "chevron.down").rotationEffect(.degrees(showCompleted ? 180 : 0))
                                }.padding(.vertical, 12)
                            }.buttonStyle(.plain)
                            if showCompleted {
                                ForEach(filtered.filter(\.isCompleted)) { task in
                                    TaskRow(task: task).onTapGesture { selectedTask = task }.transition(.opacity.combined(with: .move(edge: .top)))
                                }
                            }
                        }
                    }.padding(.horizontal, 20).padding(.bottom, 96)
                }
            }
            .background(PopPalette.background(scheme).ignoresSafeArea())
            .navigationBarHidden(true)
            .overlay(alignment: .bottomTrailing) {
                Button { showCreate = true } label: {
                    Image(systemName: "plus").font(.title2.bold()).foregroundColor(.white).frame(width: 60, height: 60)
                        .background(PopPalette.blue).clipShape(Circle()).shadow(color: PopPalette.blue.opacity(0.32), radius: 16, y: 8)
                }.padding(24)
            }
            .searchable(text: $query, prompt: "Buscar tarefas")
            .sheet(isPresented: $showCreate) { TaskEditorView() }
            .sheet(item: $selectedTask) { task in TaskDetailView(task: task) }
        }.navigationViewStyle(StackNavigationViewStyle())
    }
}

struct TaskRow: View {
    @EnvironmentObject private var store: PopStore
    @Environment(\.colorScheme) private var scheme
    let task: PopTask

    var body: some View {
        HStack(spacing: 13) {
            Button { store.toggle(task) } label: {
                ZStack {
                    Circle().stroke(task.priority.color, lineWidth: 2).frame(width: 28, height: 28)
                    if task.isCompleted {
                        Circle().fill(PopPalette.green).frame(width: 28, height: 28)
                        Image(systemName: "checkmark").font(.caption.bold()).foregroundColor(.white)
                    }
                }.scaleEffect(task.isCompleted ? 1.06 : 1)
            }.buttonStyle(.plain)
            VStack(alignment: .leading, spacing: 5) {
                Text(task.title).font(.headline).strikethrough(task.isCompleted).lineLimit(2)
                HStack(spacing: 8) {
                    Text(task.dueDate, style: .date)
                    Text(task.dueDate, style: .time)
                    if task.assignment.kind != .none { Text(task.assignment.label).lineLimit(1) }
                }.font(.caption).foregroundColor(PopPalette.muted(scheme))
            }
            Spacer()
            Circle().fill(task.priority.color).frame(width: 8, height: 8)
        }
        .padding(15).background(PopPalette.surface(scheme)).clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .opacity(store.deletingTaskID == task.id ? 0 : 1)
        .scaleEffect(store.deletingTaskID == task.id ? 0.84 : 1)
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            Button(role: .destructive) { store.delete(task) } label: { Label("Remover", systemImage: "trash") }
        }
    }
}

struct TaskEditorView: View {
    @EnvironmentObject private var store: PopStore
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var scheme
    @State private var title = ""
    @State private var detail = ""
    @State private var priority = PopPriority.medium
    @State private var dueDate = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
    @State private var assignment = AssignmentTarget.none

    private var company: CompanyWorkspace? { store.selectedCompany }

    var body: some View {
        NavigationView {
            Form {
                Section("Tarefa") {
                    TextField("O que precisa ser feito?", text: $title)
                    TextField("Descrição", text: $detail)
                }
                Section("Prioridade") {
                    Picker("Prioridade", selection: $priority) {
                        ForEach(PopPriority.allCases) { item in Text(item.rawValue).tag(item) }
                    }.pickerStyle(.segmented)
                }
                Section("Prazo") { DatePicker("Data e horário", selection: $dueDate) }
                if store.workspace == .company, let company {
                    Section("Atribuir para") { AssignmentPicker(company: company, selection: $assignment) }
                }
            }
            .navigationTitle("Nova tarefa")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancelar") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Criar") {
                        store.addTask(
                            PopTask(
                                title: title.trimmingCharacters(in: .whitespacesAndNewlines),
                                detail: detail.trimmingCharacters(in: .whitespacesAndNewlines),
                                dueDate: dueDate,
                                priority: priority,
                                workspace: store.workspace,
                                companyID: store.workspace == .company ? store.selectedCompanyID : nil,
                                assignment: assignment
                            )
                        )
                        dismiss()
                    }.disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).count < 3)
                }
            }
        }
    }
}

struct AssignmentPicker: View {
    let company: CompanyWorkspace
    @Binding var selection: AssignmentTarget

    var body: some View {
        Picker("Responsável", selection: $selection) {
            Text("Sem responsável").tag(AssignmentTarget.none)
            ForEach(company.members) { member in
                Text("Pessoa • \(member.name)").tag(AssignmentTarget(kind: .person, id: member.id, label: member.name))
            }
            ForEach(company.sectors) { sector in
                Text("Setor • \(sector.name)").tag(AssignmentTarget(kind: .sector, id: sector.id, label: sector.name))
            }
            ForEach(company.groups) { group in
                Text("Grupo • \(group.name)").tag(AssignmentTarget(kind: .group, id: group.id, label: group.name))
            }
        }
    }
}

struct TaskDetailView: View {
    @EnvironmentObject private var store: PopStore
    @Environment(\.dismiss) private var dismiss
    let task: PopTask
    @State private var showDelete = false

    var body: some View {
        NavigationView {
            List {
                Section {
                    Text(task.title).font(.title2.bold())
                    Text(task.detail.isEmpty ? "Sem descrição" : task.detail)
                }
                Section("Detalhes") {
                    Label(task.priority.rawValue, systemImage: "flag.fill").foregroundColor(task.priority.color)
                    Label { Text(task.dueDate.formatted(date: .long, time: .shortened)) } icon: { Image(systemName: "calendar") }
                    Label(task.assignment.label, systemImage: "person.crop.circle")
                }
                Section {
                    Button(task.isCompleted ? "Reabrir tarefa" : "Concluir tarefa") { store.toggle(task); dismiss() }
                    Button("Remover tarefa", role: .destructive) { showDelete = true }
                }
            }
            .navigationTitle("Detalhes")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Fechar") { dismiss() } } }
            .confirmationDialog("Remover esta tarefa?", isPresented: $showDelete, titleVisibility: .visible) {
                Button("Remover", role: .destructive) { store.delete(task); dismiss() }
            }
        }
    }
}

// MARK: - Calendar

struct CalendarView: View {
    @EnvironmentObject private var store: PopStore
    @Environment(\.colorScheme) private var scheme
    @State private var selectedDate = Date()
    @State private var selectedTask: PopTask?

    private var dayTasks: [PopTask] {
        store.visibleTasks.filter { Calendar.current.isDate($0.dueDate, inSameDayAs: selectedDate) }
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    WorkspaceHeader()
                    DatePicker("Data", selection: $selectedDate, displayedComponents: .date)
                        .datePickerStyle(.graphical)
                        .padding(8).background(PopPalette.surface(scheme)).clipShape(RoundedRectangle(cornerRadius: 22))
                        .padding(.horizontal, 20)
                    HStack {
                        Text(selectedDate.formatted(date: .long, time: .omitted)).font(.headline)
                        Spacer()
                        Text("\(dayTasks.count) tarefa\(dayTasks.count == 1 ? "" : "s")").foregroundColor(PopPalette.muted(scheme))
                    }.padding(.horizontal, 20)
                    VStack(spacing: 10) {
                        if dayTasks.isEmpty {
                            PopCard { Text("Nenhuma tarefa nesta data").foregroundColor(PopPalette.muted(scheme)) }
                        } else {
                            ForEach(dayTasks) { task in TaskRow(task: task).onTapGesture { selectedTask = task } }
                        }
                    }.padding(.horizontal, 20)
                }.padding(.bottom, 24)
            }
            .background(PopPalette.background(scheme).ignoresSafeArea()).navigationBarHidden(true)
            .sheet(item: $selectedTask) { task in TaskDetailView(task: task) }
        }.navigationViewStyle(StackNavigationViewStyle())
    }
}

// MARK: - Company management

struct CompanyEditorView: View {
    @EnvironmentObject private var store: PopStore
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var detail = ""

    var body: some View {
        NavigationView {
            Form {
                Section("Empresa") {
                    TextField("Nome da empresa", text: $name)
                    TextField("Pequena descrição", text: $detail)
                }
            }
            .navigationTitle("Criar empresa")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancelar") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Criar") { store.createCompany(name: name, detail: detail); dismiss() }
                        .disabled(name.trimmingCharacters(in: .whitespaces).count < 3 || detail.trimmingCharacters(in: .whitespaces).count < 3)
                }
            }
        }
    }
}

struct TeamView: View {
    @EnvironmentObject private var store: PopStore
    @State private var showAdd = false

    var body: some View {
        List {
            if let company = store.selectedCompany {
                ForEach(company.members) { member in
                    HStack(spacing: 12) {
                        Circle().fill(PopPalette.blue.opacity(0.14)).frame(width: 44, height: 44)
                            .overlay(Text(String(member.name.prefix(1))).fontWeight(.heavy).foregroundColor(PopPalette.blue))
                        VStack(alignment: .leading) {
                            Text(member.name).fontWeight(.bold)
                            Text([member.role, member.sector].filter { !$0.isEmpty }.joined(separator: " • ")).font(.caption).foregroundColor(.secondary)
                            if !member.email.isEmpty { Text(member.email).font(.caption2).foregroundColor(.secondary) }
                        }
                    }.padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("Equipe")
        .toolbar { ToolbarItem(placement: .navigationBarTrailing) { Button { showAdd = true } label: { Image(systemName: "person.badge.plus") } } }
        .sheet(isPresented: $showAdd) { MemberEditorView() }
    }
}

struct MemberEditorView: View {
    @EnvironmentObject private var store: PopStore
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var role = "Funcionário"
    @State private var sector = ""

    var body: some View {
        NavigationView {
            Form {
                TextField("Nome", text: $name)
                TextField("E-mail", text: $email).keyboardType(.emailAddress).textInputAutocapitalization(.never)
                TextField("Cargo", text: $role)
                TextField("Setor", text: $sector)
            }
            .navigationTitle("Cadastrar pessoa")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancelar") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Adicionar") {
                        guard var company = store.selectedCompany else { return }
                        company.members.append(CompanyMember(name: name, email: email, role: role, sector: sector))
                        store.updateCompany(company); dismiss()
                    }.disabled(name.trimmingCharacters(in: .whitespaces).count < 2)
                }
            }
        }
    }
}

struct StructureView: View {
    @EnvironmentObject private var store: PopStore
    @State private var showSector = false
    @State private var showGroup = false

    var body: some View {
        List {
            Section("Setores") {
                if let company = store.selectedCompany {
                    ForEach(company.sectors) { sector in Label(sector.name, systemImage: "square.3.layers.3d") }
                }
                Button("Adicionar setor") { showSector = true }
            }
            Section("Grupos") {
                if let company = store.selectedCompany {
                    ForEach(company.groups) { group in Label(group.name, systemImage: "person.3") }
                }
                Button("Adicionar grupo") { showGroup = true }
            }
        }
        .navigationTitle("Setores e grupos")
        .sheet(isPresented: $showSector) { StructureEditorView(kind: .sector) }
        .sheet(isPresented: $showGroup) { StructureEditorView(kind: .group) }
    }
}

private enum StructureEditorKind { case sector, group }

private struct StructureEditorView: View {
    @EnvironmentObject private var store: PopStore
    @Environment(\.dismiss) private var dismiss
    let kind: StructureEditorKind
    @State private var name = ""
    @State private var detail = ""

    var body: some View {
        NavigationView {
            Form {
                TextField(kind == .sector ? "Nome do setor" : "Nome do grupo", text: $name)
                TextField("Descrição", text: $detail)
            }
            .navigationTitle(kind == .sector ? "Novo setor" : "Novo grupo")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancelar") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Adicionar") {
                        guard var company = store.selectedCompany else { return }
                        if kind == .sector { company.sectors.append(CompanySector(name: name, detail: detail)) }
                        else { company.groups.append(CompanyGroup(name: name, detail: detail)) }
                        store.updateCompany(company); dismiss()
                    }.disabled(name.trimmingCharacters(in: .whitespaces).count < 2)
                }
            }
        }
    }
}

// MARK: - More and settings

struct MoreView: View {
    @EnvironmentObject private var store: PopStore
    @Environment(\.colorScheme) private var scheme
    @Binding var themeRaw: String

    var body: some View {
        NavigationView {
            List {
                Section {
                    HStack(spacing: 13) {
                        Circle().fill(PopPalette.blue.opacity(0.14)).frame(width: 52, height: 52)
                            .overlay(Image(systemName: "person.fill").foregroundColor(PopPalette.blue))
                        VStack(alignment: .leading, spacing: 3) {
                            Text(store.currentUser?.name ?? "Modo sem conta").font(.headline)
                            Text(store.currentUser?.email ?? "Dados salvos neste iPhone").font(.caption).foregroundColor(.secondary)
                        }
                    }.padding(.vertical, 5)
                }
                Section("Conta e preferências") {
                    NavigationLink { SettingsView(themeRaw: $themeRaw) } label: { Label("Configurações", systemImage: "gearshape.fill") }
                    if store.currentUser != nil { Button(role: .destructive) { store.signOut() } label: { Label("Sair da conta", systemImage: "rectangle.portrait.and.arrow.right") } }
                }
                if store.workspace == .company, let company = store.selectedCompany {
                    Section("Gestão da empresa") {
                        HStack { Label(company.name, systemImage: "building.2.fill"); Spacer(); Text(company.detail).font(.caption).foregroundColor(.secondary).lineLimit(1) }
                        NavigationLink { TeamView() } label: { Label("Equipe", systemImage: "person.3.fill") }
                        NavigationLink { StructureView() } label: { Label("Setores e grupos", systemImage: "point.3.connected.trianglepath.dotted") }
                    }
                }
                Section("Ajuda e informações") {
                    Link(destination: URL(string: "mailto:contato@poporganize.com")!) { Label("Falar com a gente", systemImage: "questionmark.circle") }
                    Label("Pop Organize 1.0 Beta", systemImage: "info.circle")
                    HStack { Text("Sincronização"); Spacer(); Text(store.syncMessage).font(.caption).foregroundColor(.secondary) }
                }
            }
            .navigationTitle("Mais")
        }.navigationViewStyle(StackNavigationViewStyle())
    }
}

struct SettingsView: View {
    @Binding var themeRaw: String

    var body: some View {
        List {
            Section("Aparência") {
                ForEach(PopThemeMode.allCases) { theme in
                    Button { themeRaw = theme.rawValue } label: {
                        HStack {
                            Label(theme.title, systemImage: theme == .light ? "sun.max.fill" : "moon.fill")
                            Spacer()
                            if themeRaw == theme.rawValue { Image(systemName: "checkmark").foregroundColor(PopPalette.blue) }
                        }
                    }.foregroundColor(.primary)
                }
            }
            Section("Notificações") {
                Label("Resumos de manhã, tarde e noite", systemImage: "bell.badge.fill")
                Label("Som personalizado do Pop Organize", systemImage: "speaker.wave.2.fill")
            }
        }.navigationTitle("Configurações")
    }
}
