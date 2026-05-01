import UIKit
import WebKit
import Capacitor

private var kToolbarKey: UInt8 = 0
private var kToolbarEnabledKey: UInt8 = 0
private var swizzled = false

// App color palette (from tailwind.config.js) as dynamic UIColors
private let appBackground = UIColor { trait in
    trait.userInterfaceStyle == .dark
        ? UIColor(red: 0x22/255, green: 0x1F/255, blue: 0x22/255, alpha: 1) // gray-900 #221F22
        : UIColor(red: 0xFC/255, green: 0xFC/255, blue: 0xFA/255, alpha: 1) // gray-50  #FCFCFA
}
private let appButtonTint = UIColor { trait in
    trait.userInterfaceStyle == .dark
        ? UIColor(red: 0x72/255, green: 0x70/255, blue: 0x72/255, alpha: 1) // gray-500 #727072
        : UIColor(red: 0x93/255, green: 0x92/255, blue: 0x93/255, alpha: 1) // gray-400 #939293
}
private let appDisabledTint = UIColor { trait in
    trait.userInterfaceStyle == .dark
        ? UIColor(red: 0x40/255, green: 0x3E/255, blue: 0x41/255, alpha: 1) // gray-700 #403E41
        : UIColor(red: 0xC1/255, green: 0xC0/255, blue: 0xC0/255, alpha: 1) // gray-300 #C1C0C0
}
private let appDivider = UIColor { trait in
    trait.userInterfaceStyle == .dark
        ? UIColor(red: 0x40/255, green: 0x3E/255, blue: 0x41/255, alpha: 1) // gray-700 #403E41
        : UIColor(red: 0xC1/255, green: 0xC0/255, blue: 0xC0/255, alpha: 0.6) // gray-300/60
}

class MyViewController: CAPBridgeViewController, WKScriptMessageHandler {

    private var toolbarView: UIView!
    private var allButtons: [ToolbarButton] = []

    private struct ToolbarButton {
        let id: String
        let svgPath: String   // MDI 24×24 viewBox SVG path
        let title: String
    }

    // MARK: - MDI SVG paths (24×24 viewBox, matching web FormattingToolbar icons)
    private static let mdiPaths: [String: String] = [
        // mdi:undo
        "undo": "M12.5,8C9.85,8 7.45,9 5.6,10.6L2,7V16H11L7.38,12.38C8.77,11.22 10.54,10.5 12.5,10.5C16.04,10.5 19.05,12.81 20.1,16L22.47,15.22C21.08,11.03 17.15,8 12.5,8Z",
        // mdi:redo
        "redo": "M18.4,10.6C16.55,9 14.15,8 11.5,8C6.85,8 2.92,11.03 1.54,15.22L3.9,16C4.95,12.81 7.95,10.5 11.5,10.5C13.45,10.5 15.23,11.22 16.62,12.38L13,16H22V7L18.4,10.6Z",
        // mdi:format-bold
        "bold": "M13.5,15.5H10V12.5H13.5A1.5,1.5 0 0,1 15,14A1.5,1.5 0 0,1 13.5,15.5M10,6.5H13A1.5,1.5 0 0,1 14.5,8A1.5,1.5 0 0,1 13,9.5H10M15.6,10.79C16.57,10.11 17.25,9 17.25,8C17.25,5.74 15.5,4 13.25,4H7V18H14.04C16.14,18 17.75,16.3 17.75,14.21C17.75,12.69 16.89,11.39 15.6,10.79Z",
        // mdi:format-italic
        "italic": "M10,4V7H12.21L8.79,15H6V18H14V15H11.79L15.21,7H18V4H10Z",
        // mdi:format-strikethrough
        "strikethrough": "M3,14H21V12H3M5,4V7H10V10H14V7H19V4M10,19H14V16H10V19Z",
        // mdi:format-header-1
        "heading1": "M3,4H5V10H9V4H11V18H9V12H5V18H3V4M14,18V16H16V6.31L13.5,7.75V5.44L16,4H18V16H20V18H14Z",
        // mdi:format-header-2
        "heading2": "M3,4H5V10H9V4H11V18H9V12H5V18H3V4M21,18H15A2,2 0 0,1 13,16C13,15.47 13.2,15 13.54,14.64L18.41,9.41C18.78,9.05 19,8.55 19,8A2,2 0 0,0 17,6A2,2 0 0,0 15,8H13A4,4 0 0,1 17,4A4,4 0 0,1 21,8C21,9.1 20.55,10.1 19.83,10.83L15,16H21V18Z",
        // mdi:format-header-3
        "heading3": "M3,4H5V10H9V4H11V18H9V12H5V18H3V4M15,4H19A2,2 0 0,1 21,6V16A2,2 0 0,1 19,18H15A2,2 0 0,1 13,16V15H15V16H19V12H15V10H19V6H15V7H13V6A2,2 0 0,1 15,4Z",
        // mdi:format-list-bulleted
        "list": "M7,5H21V7H7V5M7,13V11H21V13H7M4,4.5A1.5,1.5 0 0,1 5.5,6A1.5,1.5 0 0,1 4,7.5A1.5,1.5 0 0,1 2.5,6A1.5,1.5 0 0,1 4,4.5M4,10.5A1.5,1.5 0 0,1 5.5,12A1.5,1.5 0 0,1 4,13.5A1.5,1.5 0 0,1 2.5,12A1.5,1.5 0 0,1 4,10.5M7,19V17H21V19H7M4,16.5A1.5,1.5 0 0,1 5.5,18A1.5,1.5 0 0,1 4,19.5A1.5,1.5 0 0,1 2.5,18A1.5,1.5 0 0,1 4,16.5Z",
        // mdi:checkbox-marked-outline
        "checklist": "M19,19H5V5H15V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V11H19M7.91,10.08L6.5,11.5L11,16L21,6L19.59,4.58L11,13.17L7.91,10.08Z",
        // mdi:format-quote-close
        "quote": "M14,17H17L19,13V7H13V13H16M6,17H9L11,13V7H5V13H8L6,17Z",
        // mdi:code-tags
        "code": "M14.6,16.6L19.2,12L14.6,7.4L16,6L22,12L16,18L14.6,16.6M9.4,16.6L4.8,12L9.4,7.4L8,6L2,12L8,18L9.4,16.6Z",
        // mdi:link-variant
        "link": "M10.59,13.41C11,13.8 11,14.44 10.59,14.83C10.2,15.22 9.56,15.22 9.17,14.83C7.22,12.88 7.22,9.71 9.17,7.76L12.71,4.22C14.66,2.27 17.83,2.27 19.78,4.22C21.73,6.17 21.73,9.34 19.78,11.29L18.29,12.78C18.3,11.96 18.17,11.14 17.89,10.36L18.36,9.88C19.54,8.71 19.54,6.81 18.36,5.64C17.19,4.46 15.29,4.46 14.12,5.64L10.59,9.17C9.41,10.34 9.41,12.24 10.59,13.41M13.41,9.17C13.8,8.78 14.44,8.78 14.83,9.17C16.78,11.12 16.78,14.29 14.83,16.24L11.29,19.78C9.34,21.73 6.17,21.73 4.22,19.78C2.27,17.83 2.27,14.66 4.22,12.71L5.71,11.22C5.7,12.04 5.83,12.86 6.11,13.64L5.64,14.12C4.46,15.29 4.46,17.19 5.64,18.36C6.81,19.54 8.71,19.54 9.88,18.36L13.41,14.83C14.59,13.66 14.59,11.76 13.41,10.59C13,10.2 13,9.56 13.41,9.17Z",
        // mdi:format-indent-increase
        "indent": "M11,13H21V11H11M11,9H21V7H11M3,3V5H21V3M11,17H21V15H11M3,8V16L7,12M3,21H21V19H3",
        // mdi:format-indent-decrease
        "outdent": "M11,13H21V11H11M11,9H21V7H11M3,3V5H21V3M3,21H21V19H3M11,17H21V15H11M7,8V16L3,12",
    ]

    override func viewDidLoad() {
        super.viewDidLoad()
        buildToolbar()
        swizzleInputAccessoryView()
        setupCodemirrorFocusListener()
    }

    // MARK: - Render MDI SVG path into a template UIImage

    private static func mdiImage(for key: String, size: CGFloat = 20) -> UIImage? {
        guard let pathString = mdiPaths[key] else { return nil }
        let viewBox: CGFloat = 24
        let scale = size / viewBox
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: size, height: size))
        let img = renderer.image { ctx in
            ctx.cgContext.scaleBy(x: scale, y: scale)
            if let path = CGPath.from(svgPath: pathString) {
                ctx.cgContext.addPath(path)
                ctx.cgContext.fillPath()
            }
        }
        return img.withRenderingMode(.alwaysTemplate)
    }

    // MARK: - Build scrollable toolbar

    private func buildToolbar() {
        let undoRedo: [ToolbarButton] = [
            .init(id: "undo", svgPath: "undo", title: "Undo"),
            .init(id: "redo", svgPath: "redo", title: "Redo"),
        ]
        let formatting: [ToolbarButton] = [
            .init(id: "bold", svgPath: "bold", title: "Bold"),
            .init(id: "italic", svgPath: "italic", title: "Italic"),
            .init(id: "strikethrough", svgPath: "strikethrough", title: "Strikethrough"),
            .init(id: "heading1", svgPath: "heading1", title: "Heading 1"),
            .init(id: "heading2", svgPath: "heading2", title: "Heading 2"),
            .init(id: "heading3", svgPath: "heading3", title: "Heading 3"),
            .init(id: "list", svgPath: "list", title: "List"),
            .init(id: "checklist", svgPath: "checklist", title: "Checklist"),
            .init(id: "quote", svgPath: "quote", title: "Quote"),
            .init(id: "code", svgPath: "code", title: "Code"),
            .init(id: "link", svgPath: "link", title: "Link"),
            .init(id: "indent", svgPath: "indent", title: "Indent"),
            .init(id: "outdent", svgPath: "outdent", title: "Outdent"),
        ]
        allButtons = undoRedo + formatting

        let barHeight: CGFloat = 44
        let bottomMargin: CGFloat = 6
        let sideMargin: CGFloat = 6
        let cornerRadius: CGFloat = 12

        // Outer container — transparent, includes bottom margin
        let container = InputAccessoryContainerView(
            frame: CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width, height: barHeight + bottomMargin),
            innerHeight: barHeight + bottomMargin
        )
        container.autoresizingMask = [.flexibleWidth]
        container.backgroundColor = .clear

        // Inner pill — rounded, holds all content
        let pill = UIView()
        pill.backgroundColor = appBackground
        pill.layer.cornerRadius = cornerRadius
        pill.layer.cornerCurve = .continuous
        pill.clipsToBounds = true
        pill.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(pill)
        NSLayoutConstraint.activate([
            pill.topAnchor.constraint(equalTo: container.topAnchor),
            pill.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: sideMargin),
            pill.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -sideMargin),
            pill.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -bottomMargin),
        ])

        // Scroll view for format buttons (scrollable middle section)
        let scrollView = UIScrollView()
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.showsVerticalScrollIndicator = false
        scrollView.alwaysBounceHorizontal = true
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        pill.addSubview(scrollView)

        // Undo/Redo group pinned to the left
        let undoRedoStack = UIStackView()
        undoRedoStack.axis = .horizontal
        undoRedoStack.alignment = .center
        undoRedoStack.spacing = 2
        undoRedoStack.translatesAutoresizingMaskIntoConstraints = false
        for (i, btn) in undoRedo.enumerated() {
            undoRedoStack.addArrangedSubview(makeButton(btn, tag: i))
        }
        undoRedoStack.addArrangedSubview(makeDivider())
        pill.addSubview(undoRedoStack)

        // Dismiss button with divider pinned to the right
        let dismissStack = UIStackView()
        dismissStack.axis = .horizontal
        dismissStack.alignment = .center
        dismissStack.spacing = 2
        dismissStack.translatesAutoresizingMaskIntoConstraints = false
        dismissStack.addArrangedSubview(makeDivider())
        let dismissBtn = UIButton(type: .system)
        dismissBtn.setImage(UIImage(systemName: "keyboard.chevron.compact.down"), for: .normal)
        dismissBtn.tintColor = appButtonTint
        dismissBtn.addTarget(self, action: #selector(dismissKeyboard), for: .touchUpInside)
        dismissBtn.accessibilityLabel = "Dismiss keyboard"
        dismissBtn.translatesAutoresizingMaskIntoConstraints = false
        dismissStack.addArrangedSubview(dismissBtn)
        pill.addSubview(dismissStack)

        NSLayoutConstraint.activate([
            // Undo/redo pinned left
            undoRedoStack.leadingAnchor.constraint(equalTo: pill.leadingAnchor, constant: 4),
            undoRedoStack.centerYAnchor.constraint(equalTo: pill.centerYAnchor),

            // Dismiss pinned right
            dismissStack.trailingAnchor.constraint(equalTo: pill.trailingAnchor, constant: -4),
            dismissStack.centerYAnchor.constraint(equalTo: pill.centerYAnchor),
            dismissBtn.widthAnchor.constraint(equalToConstant: 36),
            dismissBtn.heightAnchor.constraint(equalToConstant: barHeight),

            // Scroll view between pinned sections
            scrollView.leadingAnchor.constraint(equalTo: undoRedoStack.trailingAnchor),
            scrollView.topAnchor.constraint(equalTo: pill.topAnchor),
            scrollView.bottomAnchor.constraint(equalTo: pill.bottomAnchor),
            scrollView.trailingAnchor.constraint(equalTo: dismissStack.leadingAnchor),
        ])

        // Stack view inside scroll view
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.alignment = .center
        stack.spacing = 2
        stack.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor, constant: 4),
            stack.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor, constant: -4),
            stack.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor),
            stack.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor),
            stack.heightAnchor.constraint(equalTo: scrollView.frameLayoutGuide.heightAnchor),
        ])

        // Format buttons (up to link)
        let fmtMainCount = formatting.count - 2 // exclude indent/outdent
        for i in 0..<fmtMainCount {
            stack.addArrangedSubview(makeButton(formatting[i], tag: undoRedo.count + i))
        }

        // Divider before indent/outdent
        stack.addArrangedSubview(makeDivider())

        // Indent / Outdent buttons
        for i in fmtMainCount..<formatting.count {
            stack.addArrangedSubview(makeButton(formatting[i], tag: undoRedo.count + i))
        }

        toolbarView = container
    }

    private func makeButton(_ btn: ToolbarButton, tag: Int) -> UIButton {
        let button = UIButton(type: .system)
        button.setImage(MyViewController.mdiImage(for: btn.svgPath), for: .normal)
        button.tintColor = appButtonTint
        button.tag = tag
        button.accessibilityLabel = btn.title
        button.addTarget(self, action: #selector(toolbarButtonTapped(_:)), for: .touchUpInside)
        button.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            button.widthAnchor.constraint(equalToConstant: 40),
            button.heightAnchor.constraint(equalToConstant: 40),
        ])
        return button
    }

    private func makeDivider() -> UIView {
        let container = UIView()
        container.translatesAutoresizingMaskIntoConstraints = false
        let line = UIView()
        line.backgroundColor = appDivider
        line.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(line)
        NSLayoutConstraint.activate([
            container.widthAnchor.constraint(equalToConstant: 9),
            container.heightAnchor.constraint(equalToConstant: 40),
            line.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            line.centerYAnchor.constraint(equalTo: container.centerYAnchor),
            line.widthAnchor.constraint(equalToConstant: 1),
            line.heightAnchor.constraint(equalToConstant: 24),
        ])
        return container
    }

    // MARK: - Actions

    @objc private func toolbarButtonTapped(_ sender: UIButton) {
        guard sender.tag >= 0, sender.tag < allButtons.count else { return }
        let id = allButtons[sender.tag].id
        webView?.evaluateJavaScript(
            "window.dispatchEvent(new CustomEvent('nativeToolbarTap',{detail:'\(id)'}))"
        )
    }

    @objc private func dismissKeyboard() {
        webView?.endEditing(true)
    }

    // MARK: - Swizzle WKContentView.inputAccessoryView

    private func swizzleInputAccessoryView() {
        guard !swizzled else { return }
        guard let wkContentViewClass = NSClassFromString("WKContentView") else { return }

        let sel = NSSelectorFromString("inputAccessoryView")
        guard let original = class_getInstanceMethod(wkContentViewClass, sel) else { return }

        let block: @convention(block) (AnyObject) -> UIView? = { obj in
            var view = obj as? UIView
            while let v = view {
                if let wk = v as? WKWebView {
                    // Only show toolbar when CodeMirror is focused
                    let enabled = (objc_getAssociatedObject(wk, &kToolbarEnabledKey) as? Bool) ?? false
                    if enabled {
                        return objc_getAssociatedObject(wk, &kToolbarKey) as? UIView
                    }
                    return nil
                }
                view = v.superview
            }
            return nil
        }

        method_setImplementation(original, imp_implementationWithBlock(block))
        swizzled = true

        if let wv = self.webView {
            objc_setAssociatedObject(wv, &kToolbarKey, toolbarView, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
            objc_setAssociatedObject(wv, &kToolbarEnabledKey, false, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
        }
    }

    // MARK: - Listen for CodeMirror focus events from JS

    private func setupCodemirrorFocusListener() {
        guard let wv = self.webView else { return }

        // Register the message handler (survives page loads)
        wv.configuration.userContentController.add(self, name: "codemirrorFocus")

        // Inject the bridge script once the page is interactive.
        // Use a WKUserScript so it re-injects on every page load / SPA navigation.
        let script = """
        window.addEventListener('codemirrorFocus', function(e) {
            window.webkit.messageHandlers.codemirrorFocus.postMessage(!!e.detail);
        });
        """
        let userScript = WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        wv.configuration.userContentController.addUserScript(userScript)
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "codemirrorFocus" else { return }
        let focused = (message.body as? Bool) ?? false
        guard let wv = self.webView else { return }

        let wasEnabled = (objc_getAssociatedObject(wv, &kToolbarEnabledKey) as? Bool) ?? false
        guard focused != wasEnabled else { return } // no change, skip

        objc_setAssociatedObject(wv, &kToolbarEnabledKey, focused, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)

        // Tell the system to re-read inputAccessoryView without disturbing focus
        if let contentView = findWKContentView(in: wv) {
            contentView.reloadInputViews()
        }
    }

    private func findWKContentView(in view: UIView) -> UIView? {
        if NSStringFromClass(type(of: view)) == "WKContentView" { return view }
        for sub in view.subviews {
            if let found = findWKContentView(in: sub) { return found }
        }
        return nil
    }
}

/// Subclass so the system sizes the inputAccessoryView correctly.
class InputAccessoryContainerView: UIView {
    private let innerHeight: CGFloat

    init(frame: CGRect, innerHeight: CGFloat) {
        self.innerHeight = innerHeight
        super.init(frame: frame)
    }

    required init?(coder: NSCoder) {
        self.innerHeight = 50
        super.init(coder: coder)
    }

    override var intrinsicContentSize: CGSize {
        return CGSize(width: UIView.noIntrinsicMetric, height: innerHeight)
    }
}

// MARK: - SVG path-data → CGPath parser (supports M, L, C, A, H, V, Z + relative variants)

private extension CGPath {
    static func from(svgPath: String) -> CGPath? {
        let path = CGMutablePath()
        var current = CGPoint.zero
        var subpathStart = CGPoint.zero

        // Tokenise: split SVG path string into (command, numbers[]) pairs
        let cmdSet = CharacterSet(charactersIn: "MmLlHhVvCcSsQqTtAaZz")
        let sepSet = CharacterSet(charactersIn: ", \t\n\r")

        var tokens: [(cmd: Character, nums: [CGFloat])] = []
        var currentCmd: Character = "M"

        let scanner = Scanner(string: svgPath)
        scanner.charactersToBeSkipped = nil

        while !scanner.isAtEnd {
            _ = scanner.scanCharacters(from: sepSet)
            if scanner.isAtEnd { break }

            // Check for command letter
            if let cmdStr = scanner.scanCharacters(from: cmdSet), let c = cmdStr.last {
                currentCmd = c
            }

            // Collect numbers until next command
            var nums: [CGFloat] = []
            while !scanner.isAtEnd {
                _ = scanner.scanCharacters(from: sepSet)
                if scanner.isAtEnd { break }
                // Peek for next command
                let idx = scanner.currentIndex
                if let peek = scanner.scanCharacters(from: cmdSet), !peek.isEmpty {
                    scanner.currentIndex = idx
                    break
                }
                if let val = scanner.scanDouble() {
                    nums.append(CGFloat(val))
                } else {
                    // skip unknown char
                    scanner.currentIndex = scanner.string.index(after: scanner.currentIndex)
                }
            }

            tokens.append((cmd: currentCmd, nums: nums))
        }

        for token in tokens {
            let cmd = token.cmd
            let n = token.nums
            let isRel = cmd.isLowercase
            let upper = Character(String(cmd).uppercased())

            switch upper {
            case "M":
                var i = 0
                while i + 1 < n.count {
                    let pt = isRel ? CGPoint(x: current.x + n[i], y: current.y + n[i+1])
                                   : CGPoint(x: n[i], y: n[i+1])
                    if i == 0 { path.move(to: pt); subpathStart = pt }
                    else { path.addLine(to: pt) }
                    current = pt; i += 2
                }
            case "L":
                var i = 0
                while i + 1 < n.count {
                    let pt = isRel ? CGPoint(x: current.x + n[i], y: current.y + n[i+1])
                                   : CGPoint(x: n[i], y: n[i+1])
                    path.addLine(to: pt); current = pt; i += 2
                }
            case "H":
                for v in n {
                    let pt = CGPoint(x: isRel ? current.x + v : v, y: current.y)
                    path.addLine(to: pt); current = pt
                }
            case "V":
                for v in n {
                    let pt = CGPoint(x: current.x, y: isRel ? current.y + v : v)
                    path.addLine(to: pt); current = pt
                }
            case "C":
                var i = 0
                while i + 5 < n.count {
                    let c1 = isRel ? CGPoint(x: current.x + n[i],   y: current.y + n[i+1])
                                   : CGPoint(x: n[i],   y: n[i+1])
                    let c2 = isRel ? CGPoint(x: current.x + n[i+2], y: current.y + n[i+3])
                                   : CGPoint(x: n[i+2], y: n[i+3])
                    let pt = isRel ? CGPoint(x: current.x + n[i+4], y: current.y + n[i+5])
                                   : CGPoint(x: n[i+4], y: n[i+5])
                    path.addCurve(to: pt, control1: c1, control2: c2)
                    current = pt; i += 6
                }
            case "A":
                var i = 0
                while i + 6 < n.count {
                    let pt = isRel ? CGPoint(x: current.x + n[i+5], y: current.y + n[i+6])
                                   : CGPoint(x: n[i+5], y: n[i+6])
                    path.addLine(to: pt); current = pt; i += 7
                }
            case "Z":
                path.closeSubpath(); current = subpathStart
            default: break
            }
        }
        return path
    }
}
