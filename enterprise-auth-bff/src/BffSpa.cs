namespace EnterpriseAuthBff;

public static class BffSpa
{
    private static readonly Dictionary<string, string> ContentTypes = new() {
        [".html"] = "text/html; charset=utf-8", [".js"] = "text/javascript; charset=utf-8",
        [".css"] = "text/css; charset=utf-8", [".svg"] = "image/svg+xml", [".png"] = "image/png",
        [".jpg"] = "image/jpeg", [".ico"] = "image/x-icon", [".woff2"] = "font/woff2"
    };
    public static async Task Serve(HttpContext context, string contentRoot)
    {
        if (context.Request.Method is not ("GET" or "HEAD")) { context.Response.StatusCode = 405; return; }
        var root = Path.GetFullPath(Path.Combine(contentRoot, "../../bootstrap5/dist"));
        if (!File.Exists(Path.Combine(root, "index.html")))
        {
            context.Response.StatusCode = 503;
            await context.Response.WriteAsync("Build bootstrap5/dist with npm run build before starting the BFF."); return;
        }
        var path = context.Request.Path.Value!;
        // Only the SPA entry/routes and Vite build assets; never expose repo files.
        var relative = path == "/" || path == "/dashboard" || path.StartsWith("/dashboard/", StringComparison.Ordinal)
            ? "index.html" : path.StartsWith("/assets/", StringComparison.Ordinal) ? path[1..] : "";
        if (relative.Length == 0 || !ContentTypes.TryGetValue(Path.GetExtension(relative), out var type))
        { context.Response.StatusCode = 404; return; }
        var file = Path.GetFullPath(Path.Combine(root, relative));
        if (!file.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.Ordinal) || !File.Exists(file))
        { context.Response.StatusCode = 404; return; }
        // Deployment must contain only trusted regular build outputs (no symlinks).
        var current = new FileInfo(file) as FileSystemInfo;
        while (current != null && current.FullName != Path.GetPathRoot(root))
        {
            if (current.LinkTarget != null) { context.Response.StatusCode = 404; return; }
            current = current is FileInfo f ? f.Directory : (current as DirectoryInfo)?.Parent;
        }
        context.Response.ContentType = type;
        if (context.Request.Method != "HEAD") await context.Response.SendFileAsync(file);
    }
}
