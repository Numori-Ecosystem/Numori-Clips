package notes.numori.app;

import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageButton;
import android.widget.LinearLayout;

import com.getcapacitor.BridgeActivity;

import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

public class MainActivity extends BridgeActivity {

    private View toolbarView;
    private boolean toolbarVisible = false;
    private boolean codemirrorFocused = false;

    private static final Set<String> SUPPORTED_EXTENSIONS = new HashSet<>(
        Arrays.asList(".num", ".txt", ".md", ".csv")
    );

    // Button IDs in order — matches iOS / web FormattingToolbar
    private static final String[][] UNDO_REDO = {
        {"undo", "Undo"}, {"redo", "Redo"}
    };
    private static final String[][] FORMAT_BUTTONS = {
        {"bold", "Bold"}, {"italic", "Italic"}, {"strikethrough", "Strikethrough"},
        {"heading1", "Heading 1"}, {"heading2", "Heading 2"}, {"heading3", "Heading 3"},
        {"list", "List"}, {"checklist", "Checklist"}, {"quote", "Quote"},
        {"code", "Code"}, {"link", "Link"}
    };
    private static final String[][] INDENT_BUTTONS = {
        {"indent", "Indent"}, {"outdent", "Outdent"}
    };

    // MDI 24×24 viewBox SVG paths — same as iOS MyViewController.swift
    private static final Map<String, String> MDI_PATHS = new LinkedHashMap<>();
    static {
        MDI_PATHS.put("undo", "M12.5,8C9.85,8 7.45,9 5.6,10.6L2,7V16H11L7.38,12.38C8.77,11.22 10.54,10.5 12.5,10.5C16.04,10.5 19.05,12.81 20.1,16L22.47,15.22C21.08,11.03 17.15,8 12.5,8Z");
        MDI_PATHS.put("redo", "M18.4,10.6C16.55,9 14.15,8 11.5,8C6.85,8 2.92,11.03 1.54,15.22L3.9,16C4.95,12.81 7.95,10.5 11.5,10.5C13.45,10.5 15.23,11.22 16.62,12.38L13,16H22V7L18.4,10.6Z");
        MDI_PATHS.put("bold", "M13.5,15.5H10V12.5H13.5A1.5,1.5 0 0,1 15,14A1.5,1.5 0 0,1 13.5,15.5M10,6.5H13A1.5,1.5 0 0,1 14.5,8A1.5,1.5 0 0,1 13,9.5H10M15.6,10.79C16.57,10.11 17.25,9 17.25,8C17.25,5.74 15.5,4 13.25,4H7V18H14.04C16.14,18 17.75,16.3 17.75,14.21C17.75,12.69 16.89,11.39 15.6,10.79Z");
        MDI_PATHS.put("italic", "M10,4V7H12.21L8.79,15H6V18H14V15H11.79L15.21,7H18V4H10Z");
        MDI_PATHS.put("strikethrough", "M3,14H21V12H3M5,4V7H10V10H14V7H19V4M10,19H14V16H10V19Z");
        MDI_PATHS.put("heading1", "M3,4H5V10H9V4H11V18H9V12H5V18H3V4M14,18V16H16V6.31L13.5,7.75V5.44L16,4H18V16H20V18H14Z");
        MDI_PATHS.put("heading2", "M3,4H5V10H9V4H11V18H9V12H5V18H3V4M21,18H15A2,2 0 0,1 13,16C13,15.47 13.2,15 13.54,14.64L18.41,9.41C18.78,9.05 19,8.55 19,8A2,2 0 0,0 17,6A2,2 0 0,0 15,8H13A4,4 0 0,1 17,4A4,4 0 0,1 21,8C21,9.1 20.55,10.1 19.83,10.83L15,16H21V18Z");
        MDI_PATHS.put("heading3", "M3,4H5V10H9V4H11V18H9V12H5V18H3V4M15,4H19A2,2 0 0,1 21,6V16A2,2 0 0,1 19,18H15A2,2 0 0,1 13,16V15H15V16H19V12H15V10H19V6H15V7H13V6A2,2 0 0,1 15,4Z");
        MDI_PATHS.put("list", "M7,5H21V7H7V5M7,13V11H21V13H7M4,4.5A1.5,1.5 0 0,1 5.5,6A1.5,1.5 0 0,1 4,7.5A1.5,1.5 0 0,1 2.5,6A1.5,1.5 0 0,1 4,4.5M4,10.5A1.5,1.5 0 0,1 5.5,12A1.5,1.5 0 0,1 4,13.5A1.5,1.5 0 0,1 2.5,12A1.5,1.5 0 0,1 4,10.5M7,19V17H21V19H7M4,16.5A1.5,1.5 0 0,1 5.5,18A1.5,1.5 0 0,1 4,19.5A1.5,1.5 0 0,1 2.5,18A1.5,1.5 0 0,1 4,16.5Z");
        MDI_PATHS.put("checklist", "M19,19H5V5H15V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V11H19M7.91,10.08L6.5,11.5L11,16L21,6L19.59,4.58L11,13.17L7.91,10.08Z");
        MDI_PATHS.put("quote", "M14,17H17L19,13V7H13V13H16M6,17H9L11,13V7H5V13H8L6,17Z");
        MDI_PATHS.put("code", "M14.6,16.6L19.2,12L14.6,7.4L16,6L22,12L16,18L14.6,16.6M9.4,16.6L4.8,12L9.4,7.4L8,6L2,12L8,18L9.4,16.6Z");
        MDI_PATHS.put("link", "M10.59,13.41C11,13.8 11,14.44 10.59,14.83C10.2,15.22 9.56,15.22 9.17,14.83C7.22,12.88 7.22,9.71 9.17,7.76L12.71,4.22C14.66,2.27 17.83,2.27 19.78,4.22C21.73,6.17 21.73,9.34 19.78,11.29L18.29,12.78C18.3,11.96 18.17,11.14 17.89,10.36L18.36,9.88C19.54,8.71 19.54,6.81 18.36,5.64C17.19,4.46 15.29,4.46 14.12,5.64L10.59,9.17C9.41,10.34 9.41,12.24 10.59,13.41M13.41,9.17C13.8,8.78 14.44,8.78 14.83,9.17C16.78,11.12 16.78,14.29 14.83,16.24L11.29,19.78C9.34,21.73 6.17,21.73 4.22,19.78C2.27,17.83 2.27,14.66 4.22,12.71L5.71,11.22C5.7,12.04 5.83,12.86 6.11,13.64L5.64,14.12C4.46,15.29 4.46,17.19 5.64,18.36C6.81,19.54 8.71,19.54 9.88,18.36L13.41,14.83C14.59,13.66 14.59,11.76 13.41,10.59C13,10.2 13,9.56 13.41,9.17Z");
        MDI_PATHS.put("indent", "M11,13H21V11H11M11,9H21V7H11M3,3V5H21V3M11,17H21V15H11M3,8V16L7,12M3,21H21V19H3");
        MDI_PATHS.put("outdent", "M11,13H21V11H11M11,9H21V7H11M3,3V5H21V3M3,21H21V19H3M11,17H21V15H11M7,8V16L3,12");
        MDI_PATHS.put("keyboard_hide", "M20,1H4A2,2 0 0,0 2,3V15A2,2 0 0,0 4,17H20A2,2 0 0,0 22,15V3A2,2 0 0,0 20,1M11,5H13V7H11V5M11,9H13V11H11V9M7,5H9V7H7V5M7,9H9V11H7V9M5,9H7V11H5V9M5,5H7V7H5V5M8,13H16V15H8V13M15,11H17V9H15V11M15,7H17V5H15V7M19,11H17V9H19V11M19,7H17V5H19V7M12,21L8,17H16L12,21Z");
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildToolbar();
        setupKeyboardListener();
        handleFileIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleFileIntent(intent);
    }

    private void handleFileIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!Intent.ACTION_VIEW.equals(action)) return;

        Uri uri = intent.getData();
        if (uri == null) return;

        String uriString = uri.toString();
        // Check if the file extension is supported
        String ext = getFileExtension(uriString);
        if (!SUPPORTED_EXTENSIONS.contains(ext)) {
            // Dispatch unsupported event to WebView
            WebView wv = getBridge() != null ? getBridge().getWebView() : null;
            if (wv != null) {
                String fileName = uri.getLastPathSegment() != null ? uri.getLastPathSegment() : uriString;
                wv.post(() -> wv.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('open-with-unsupported',{detail:{fileName:'" +
                    fileName.replace("'", "\\'") + "'}}))", null));
            }
            return;
        }

        // Pass the URI to the WebView via appUrlOpen (Capacitor's App plugin will pick it up)
        WebView wv = getBridge() != null ? getBridge().getWebView() : null;
        if (wv != null) {
            wv.post(() -> wv.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('open-with-file',{detail:{uri:'" +
                uriString.replace("'", "\\'") + "'}}))", null));
        }
    }

    private String getFileExtension(String path) {
        int dotIndex = path.lastIndexOf('.');
        if (dotIndex == -1 || dotIndex == path.length() - 1) return "";
        // Strip query params if present
        String ext = path.substring(dotIndex);
        int queryIndex = ext.indexOf('?');
        if (queryIndex != -1) ext = ext.substring(0, queryIndex);
        return ext.toLowerCase();
    }

    // ── Theme colors (matching iOS / tailwind palette) ──────────────────

    private int bgColor() {
        boolean dark = (getResources().getConfiguration().uiMode
                & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        return dark ? 0xFF221F22 : 0xFFFCFCFA;
    }

    private int buttonTint() {
        boolean dark = (getResources().getConfiguration().uiMode
                & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        return dark ? 0xFF727072 : 0xFF939293;
    }

    private int dividerColor() {
        boolean dark = (getResources().getConfiguration().uiMode
                & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        return dark ? 0xFF403E41 : 0x99C1C0C0; // gray-700 / gray-300 @ 60%
    }

    // ── Build the toolbar view ──────────────────────────────────────────

    private void buildToolbar() {
        int barH = dpToPx(44);
        int bottomMargin = dpToPx(6);
        int sideMargin = dpToPx(6);
        int cornerRadius = dpToPx(12);
        int btnSize = dpToPx(40);
        int iconSize = dpToPx(20);

        // Outer container (transparent, includes bottom margin)
        FrameLayout container = new FrameLayout(this);
        container.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, barH + bottomMargin));
        container.setVisibility(View.GONE);

        // Inner pill with rounded background
        FrameLayout pill = new FrameLayout(this);
        FrameLayout.LayoutParams pillLp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, barH);
        pillLp.setMargins(sideMargin, 0, sideMargin, bottomMargin);
        pill.setLayoutParams(pillLp);
        pill.setBackgroundResource(0);
        android.graphics.drawable.GradientDrawable pillBg = new android.graphics.drawable.GradientDrawable();
        pillBg.setColor(bgColor());
        pillBg.setCornerRadius(cornerRadius);
        pill.setBackground(pillBg);
        pill.setClipToOutline(true);
        pill.setOutlineProvider(new android.view.ViewOutlineProvider() {
            @Override
            public void getOutline(View view, android.graphics.Outline outline) {
                outline.setRoundRect(0, 0, view.getWidth(), view.getHeight(), cornerRadius);
            }
        });
        // Undo/Redo buttons pinned to the left
        LinearLayout undoRedoGroup = new LinearLayout(this);
        undoRedoGroup.setOrientation(LinearLayout.HORIZONTAL);
        undoRedoGroup.setGravity(Gravity.CENTER_VERTICAL);
        undoRedoGroup.setPadding(dpToPx(4), 0, 0, 0);
        for (String[] def : UNDO_REDO) {
            undoRedoGroup.addView(makeButton(def[0], def[1], btnSize, iconSize));
        }
        // Divider after undo/redo
        View leftDiv = new View(this);
        leftDiv.setBackgroundColor(dividerColor());
        LinearLayout.LayoutParams leftDivLp = new LinearLayout.LayoutParams(dpToPx(1), dpToPx(24));
        leftDivLp.setMargins(dpToPx(4), 0, dpToPx(4), 0);
        leftDivLp.gravity = Gravity.CENTER_VERTICAL;
        leftDiv.setLayoutParams(leftDivLp);
        undoRedoGroup.addView(leftDiv);
        FrameLayout.LayoutParams undoRedoLp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, barH, Gravity.START | Gravity.CENTER_VERTICAL);
        pill.addView(undoRedoGroup, undoRedoLp);

        // Dismiss keyboard button with divider (pinned right)
        LinearLayout dismissGroup = new LinearLayout(this);
        dismissGroup.setOrientation(LinearLayout.HORIZONTAL);
        dismissGroup.setGravity(Gravity.CENTER_VERTICAL);
        dismissGroup.setPadding(0, 0, dpToPx(4), 0);
        View rightDiv = new View(this);
        rightDiv.setBackgroundColor(dividerColor());
        LinearLayout.LayoutParams rightDivLp = new LinearLayout.LayoutParams(dpToPx(1), dpToPx(24));
        rightDivLp.setMargins(dpToPx(4), 0, dpToPx(4), 0);
        rightDivLp.gravity = Gravity.CENTER_VERTICAL;
        rightDiv.setLayoutParams(rightDivLp);
        dismissGroup.addView(rightDiv);
        ImageButton dismissBtn = new ImageButton(this);
        dismissBtn.setBackground(null);
        dismissBtn.setImageDrawable(mdiDrawable("keyboard_hide", iconSize, buttonTint()));
        dismissBtn.setContentDescription("Dismiss keyboard");
        dismissBtn.setOnClickListener(v -> dismissKeyboard());
        dismissGroup.addView(dismissBtn, new LinearLayout.LayoutParams(dpToPx(36), btnSize));
        FrameLayout.LayoutParams dismissLp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, barH, Gravity.END | Gravity.CENTER_VERTICAL);
        pill.addView(dismissGroup, dismissLp);

        // Measure undo/redo width to set scroll margins
        undoRedoGroup.measure(View.MeasureSpec.UNSPECIFIED, View.MeasureSpec.UNSPECIFIED);
        int leftFixedWidth = undoRedoGroup.getMeasuredWidth();

        // Measure dismiss group width to set scroll margins
        dismissGroup.measure(View.MeasureSpec.UNSPECIFIED, View.MeasureSpec.UNSPECIFIED);
        int rightFixedWidth = dismissGroup.getMeasuredWidth();

        // Scroll view for format buttons (between pinned sections)
        HorizontalScrollView scrollView = new HorizontalScrollView(this);
        scrollView.setHorizontalScrollBarEnabled(false);
        scrollView.setOverScrollMode(View.OVER_SCROLL_ALWAYS);
        FrameLayout.LayoutParams scrollLp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, barH);
        scrollLp.setMarginStart(leftFixedWidth);
        scrollLp.setMarginEnd(rightFixedWidth);
        pill.addView(scrollView, scrollLp);

        // Linear layout inside scroll view
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        int pad = dpToPx(4);
        row.setPadding(pad, 0, pad, 0);
        scrollView.addView(row, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.MATCH_PARENT));

        // Format buttons
        for (String[] def : FORMAT_BUTTONS) {
            row.addView(makeButton(def[0], def[1], btnSize, iconSize));
        }
        row.addView(makeDivider(barH));

        // Indent / outdent
        for (String[] def : INDENT_BUTTONS) {
            row.addView(makeButton(def[0], def[1], btnSize, iconSize));
        }

        container.addView(pill);
        toolbarView = container;
    }

    private ImageButton makeButton(String id, String label, int size, int iconSize) {
        ImageButton btn = new ImageButton(this);
        btn.setBackground(null);
        btn.setImageDrawable(mdiDrawable(id, iconSize, buttonTint()));
        btn.setContentDescription(label);
        btn.setPadding(0, 0, 0, 0);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(size, size);
        lp.setMargins(dpToPx(1), 0, dpToPx(1), 0);
        btn.setLayoutParams(lp);
        btn.setOnClickListener(v -> onToolbarButtonTap(id));
        return btn;
    }

    private View makeDivider(int height) {
        View line = new View(this);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dpToPx(1), dpToPx(24));
        lp.setMargins(dpToPx(4), 0, dpToPx(4), 0);
        lp.gravity = Gravity.CENTER_VERTICAL;
        line.setLayoutParams(lp);
        line.setBackgroundColor(dividerColor());
        return line;
    }

    // ── Keyboard detection & toolbar show/hide ──────────────────────────

    private void setupKeyboardListener() {
        // Attach toolbar to the root FrameLayout (decor content)
        FrameLayout content = findViewById(android.R.id.content);
        content.addView(toolbarView);

        // Use ViewTreeObserver to detect keyboard show/hide via layout changes
        final View rootView = content;
        rootView.getViewTreeObserver().addOnGlobalLayoutListener(() -> {
            android.graphics.Rect r = new android.graphics.Rect();
            rootView.getWindowVisibleDisplayFrame(r);
            int screenHeight = rootView.getRootView().getHeight();
            int keyboardHeight = screenHeight - r.bottom;

            // Keyboard is considered visible if it takes up > 15% of screen
            if (keyboardHeight > screenHeight * 0.15) {
                // Check if CodeMirror is focused via the global flag set by NoteEditor.vue
                WebView wv = getBridge() != null ? getBridge().getWebView() : null;
                if (wv != null) {
                    wv.evaluateJavascript("window.__codemirrorFocused===true", value -> {
                        boolean cmFocused = "true".equals(value);
                        runOnUiThread(() -> {
                            codemirrorFocused = cmFocused;
                            if (cmFocused) {
                                showToolbar(keyboardHeight);
                            } else {
                                hideToolbar();
                            }
                        });
                    });
                } else {
                    hideToolbar();
                }
            } else {
                hideToolbar();
            }
        });
    }

    private void showToolbar(int keyboardHeight) {
        if (toolbarView == null) return;
        FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) toolbarView.getLayoutParams();
        lp.gravity = Gravity.BOTTOM;
        lp.bottomMargin = keyboardHeight;
        toolbarView.setLayoutParams(lp);
        if (!toolbarVisible) {
            toolbarView.setVisibility(View.VISIBLE);
            toolbarVisible = true;
        }
    }

    private void hideToolbar() {
        if (toolbarView == null) return;
        if (toolbarVisible) {
            toolbarView.setVisibility(View.GONE);
            toolbarVisible = false;
        }
    }

    // ── Button tap → JS bridge ──────────────────────────────────────────

    private void onToolbarButtonTap(String id) {
        if (getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.post(() -> webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('nativeToolbarTap',{detail:'" + id + "'}))",
                null
            ));
        }
    }

    private void dismissKeyboard() {
        // Blur any focused element inside the WebView via JS
        if (getBridge() != null) {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.evaluateJavascript("document.activeElement && document.activeElement.blur()", null);
            }
        }
        // Also hide via InputMethodManager using the decor view's token
        android.view.inputmethod.InputMethodManager imm =
            (android.view.inputmethod.InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
        if (imm != null) {
            View decor = getWindow().getDecorView();
            imm.hideSoftInputFromWindow(decor.getWindowToken(), 0);
        }
    }

    // ── SVG path → Android Drawable ─────────────────────────────────────

    private Drawable mdiDrawable(String key, int sizePx, int color) {
        String pathData = MDI_PATHS.get(key);
        if (pathData == null) return null;

        Path path = parseSvgPath(pathData);
        float scale = sizePx / 24f;
        Matrix matrix = new Matrix();
        matrix.setScale(scale, scale);
        path.transform(matrix);

        Bitmap bmp = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(color);
        paint.setStyle(Paint.Style.FILL);
        canvas.drawPath(path, paint);

        return new BitmapDrawable(getResources(), bmp);
    }

    // ── SVG path-data parser (M, L, H, V, C, A, Z + relative) ──────────

    private static Path parseSvgPath(String d) {
        Path path = new Path();
        float cx = 0, cy = 0;
        float sx = 0, sy = 0; // subpath start

        int i = 0;
        char cmd = 'M';
        while (i < d.length()) {
            // skip whitespace/commas
            while (i < d.length() && (d.charAt(i) == ' ' || d.charAt(i) == ',' || d.charAt(i) == '\n')) i++;
            if (i >= d.length()) break;

            char c = d.charAt(i);
            if (Character.isLetter(c)) {
                cmd = c;
                i++;
            }

            char upper = Character.toUpperCase(cmd);
            boolean rel = Character.isLowerCase(cmd);

            switch (upper) {
                case 'M': {
                    float[] p = readFloats(d, i, 2);
                    i = (int) p[2];
                    float x = rel ? cx + p[0] : p[0];
                    float y = rel ? cy + p[1] : p[1];
                    path.moveTo(x, y);
                    cx = x; cy = y; sx = x; sy = y;
                    // subsequent coords are implicit lineTo
                    cmd = rel ? 'l' : 'L';
                    break;
                }
                case 'L': {
                    float[] p = readFloats(d, i, 2);
                    i = (int) p[2];
                    float x = rel ? cx + p[0] : p[0];
                    float y = rel ? cy + p[1] : p[1];
                    path.lineTo(x, y);
                    cx = x; cy = y;
                    break;
                }
                case 'H': {
                    float[] p = readFloats(d, i, 1);
                    i = (int) p[1];
                    float x = rel ? cx + p[0] : p[0];
                    path.lineTo(x, cy);
                    cx = x;
                    break;
                }
                case 'V': {
                    float[] p = readFloats(d, i, 1);
                    i = (int) p[1];
                    float y = rel ? cy + p[0] : p[0];
                    path.lineTo(cx, y);
                    cy = y;
                    break;
                }
                case 'C': {
                    float[] p = readFloats(d, i, 6);
                    i = (int) p[6];
                    float x1 = rel ? cx + p[0] : p[0];
                    float y1 = rel ? cy + p[1] : p[1];
                    float x2 = rel ? cx + p[2] : p[2];
                    float y2 = rel ? cy + p[3] : p[3];
                    float x  = rel ? cx + p[4] : p[4];
                    float y  = rel ? cy + p[5] : p[5];
                    path.cubicTo(x1, y1, x2, y2, x, y);
                    cx = x; cy = y;
                    break;
                }
                case 'A': {
                    // Simplified: just lineTo the endpoint (same as iOS impl)
                    float[] p = readFloats(d, i, 7);
                    i = (int) p[7];
                    float x = rel ? cx + p[5] : p[5];
                    float y = rel ? cy + p[6] : p[6];
                    path.lineTo(x, y);
                    cx = x; cy = y;
                    break;
                }
                case 'Z': {
                    path.close();
                    cx = sx; cy = sy;
                    break;
                }
                default:
                    i++; // skip unknown
                    break;
            }
        }
        return path;
    }

    /** Read `count` floats from SVG path data starting at index `start`.
     *  Returns array of [float0, float1, ..., floatN-1, newIndex]. */
    private static float[] readFloats(String d, int start, int count) {
        float[] result = new float[count + 1];
        int i = start;
        for (int n = 0; n < count; n++) {
            // skip separators
            while (i < d.length() && (d.charAt(i) == ' ' || d.charAt(i) == ',' || d.charAt(i) == '\n')) i++;
            int numStart = i;
            if (i < d.length() && (d.charAt(i) == '-' || d.charAt(i) == '+')) i++;
            while (i < d.length() && (Character.isDigit(d.charAt(i)) || d.charAt(i) == '.')) i++;
            // handle exponent
            if (i < d.length() && (d.charAt(i) == 'e' || d.charAt(i) == 'E')) {
                i++;
                if (i < d.length() && (d.charAt(i) == '-' || d.charAt(i) == '+')) i++;
                while (i < d.length() && Character.isDigit(d.charAt(i))) i++;
            }
            if (numStart == i) {
                result[n] = 0;
            } else {
                result[n] = Float.parseFloat(d.substring(numStart, i));
            }
        }
        result[count] = i;
        return result;
    }

    private int dpToPx(int dp) {
        return Math.round(TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, dp, getResources().getDisplayMetrics()));
    }
}
