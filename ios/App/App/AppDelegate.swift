import UIKit
import ComposeApp

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = MainViewControllerKt.MainViewController()
        window.tintColor = UIColor(red: 22 / 255, green: 135 / 255, blue: 248 / 255, alpha: 1)
        window.makeKeyAndVisible()
        self.window = window
        return true
    }

}
