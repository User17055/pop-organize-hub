import UIKit
import SwiftUI

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    private let store = PopStore()

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        NotificationCoordinator.shared.configure()

        let rootView = PopNativeRootView().environmentObject(store)
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = UIHostingController(rootView: rootView)
        window.tintColor = UIColor(red: 22 / 255, green: 135 / 255, blue: 248 / 255, alpha: 1)
        window.makeKeyAndVisible()
        self.window = window
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        NotificationCoordinator.shared.clearBadge()
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        NotificationCoordinator.shared.storeRemoteDeviceToken(deviceToken)
    }
}
