import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    private static let supportedExtensions: Set<String> = ["num", "txt", "md", "csv"]

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Handle file "Open With" from other apps or Files
        if url.isFileURL {
            let ext = url.pathExtension.lowercased()
            if AppDelegate.supportedExtensions.contains(ext) {
                handleIncomingFile(url: url)
            } else {
                showUnsupportedFileAlert(fileName: url.lastPathComponent)
            }
            return true
        }

        // Fallback to Capacitor's default URL handling (deep links)
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // MARK: - File handling

    private func handleIncomingFile(url: URL) {
        // Ensure we can access the file (it may be security-scoped)
        let accessing = url.startAccessingSecurityScopedResource()
        defer {
            if accessing { url.stopAccessingSecurityScopedResource() }
        }

        guard let content = try? String(contentsOf: url, encoding: .utf8) else {
            showUnsupportedFileAlert(fileName: url.lastPathComponent)
            return
        }

        // Pass file to WebView via JavaScript
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            guard let vc = self.window?.rootViewController as? CAPBridgeViewController,
                  let webView = vc.webView else { return }

            let fileName = url.lastPathComponent.replacingOccurrences(of: "'", with: "\\'")
            let escapedContent = content
                .replacingOccurrences(of: "\\", with: "\\\\")
                .replacingOccurrences(of: "'", with: "\\'")
                .replacingOccurrences(of: "\n", with: "\\n")
                .replacingOccurrences(of: "\r", with: "\\r")

            let js = "window.dispatchEvent(new CustomEvent('open-with-file-content',{detail:{fileName:'\(fileName)',content:'\(escapedContent)'}}));"
            webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    private func showUnsupportedFileAlert(fileName: String) {
        DispatchQueue.main.async {
            let alert = UIAlertController(
                title: "File format not supported",
                message: "The file \"\(fileName)\" cannot be opened.\n\nSupported formats: .num, .txt, .md, .csv",
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            self.window?.rootViewController?.present(alert, animated: true)
        }
    }
}
