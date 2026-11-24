using System.Net.Http.Headers;
using System.Text.RegularExpressions;

namespace EnterpriseAuthBff;

public static class BffProxy
{
    public const int MaxBody = 400_000;
    public const int MaxResponseBody = 2_000_000;
    public static bool SafePath(string path) => path == "/" ||
        Regex.IsMatch(path, "\\A/(?:[A-Za-z0-9_-][A-Za-z0-9_.-]*)(?:/[A-Za-z0-9_-][A-Za-z0-9_.-]*)*/?\\z", RegexOptions.CultureInvariant);
    public static bool SameSiteMetadata(HttpRequest request) => !request.Headers.ContainsKey("Sec-Fetch-Site") ||
        request.Headers["Sec-Fetch-Site"].ToString() is "same-origin" or "none";
    public static bool SameOrigin(HttpRequest request, BffSettings settings) =>
        request.Headers.Origin.Count == 1 && request.Headers.Origin[0] == settings.PublicOrigin && SameSiteMetadata(request);

    public static async Task Forward(HttpContext context, BffSettings settings, MappedPrincipal principal)
    {
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted);
        deadline.CancelAfter(TimeSpan.FromSeconds(120));
        try { await ForwardCore(context, settings, principal, deadline.Token); }
        catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException or IOException)
        {
            if (!context.Response.HasStarted) context.Response.StatusCode = 502;
            else context.Abort();
        }
    }

    private static async Task ForwardCore(HttpContext context, BffSettings settings, MappedPrincipal principal, CancellationToken cancellationToken)
    {
        if (context.Request.QueryString.HasValue) { context.Response.StatusCode = 400; return; }
        if (context.Request.Method is not ("GET" or "POST")) { context.Response.StatusCode = 405; return; }
        var api = context.Request.Path.StartsWithSegments("/enterprise-api", out var remainder);
        if (!api) context.Request.Path.StartsWithSegments("/enterprise-search", out remainder);
        var target = new Uri((api ? "http://127.0.0.1:5077" : "http://127.0.0.1:5088") + remainder.Value);
        using var message = new HttpRequestMessage(new HttpMethod(context.Request.Method), target);
        message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", InternalBearer.Issue(principal, settings.SigningSecret));
        message.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        if (context.Request.Headers.TryGetValue("Idempotency-Key", out var key))
        {
            if (key.Count != 1 || !Regex.IsMatch(key.ToString(), "\\A[A-Za-z0-9._-]{1,128}\\z"))
            { context.Response.StatusCode = 400; return; }
            message.Headers.Add("Idempotency-Key", key.ToString());
        }
        if (context.Request.ContentLength > MaxBody) { context.Response.StatusCode = 413; return; }
        // Buffer at most MaxBody+1, including chunked bodies; no outbound request on denial.
        using var body = new MemoryStream();
        var buffer = new byte[8192];
        while (true)
        {
            var count = await context.Request.Body.ReadAsync(buffer.AsMemory(0, Math.Min(buffer.Length, MaxBody + 1 - (int)body.Length)), cancellationToken);
            if (count == 0) break;
            body.Write(buffer, 0, count);
            if (body.Length > MaxBody) { context.Response.StatusCode = 413; return; }
        }
        if (context.Request.Method == "POST")
        {
            if (!MediaTypeHeaderValue.TryParse(context.Request.ContentType, out var contentType) || contentType.MediaType != "application/json")
            { context.Response.StatusCode = 415; return; }
            message.Content = new ByteArrayContent(body.ToArray());
            message.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json") { CharSet = "utf-8" };
        }
        else if (body.Length != 0) { context.Response.StatusCode = 400; return; }
        var client = context.RequestServices.GetRequiredService<IHttpClientFactory>().CreateClient("upstream");
        using var response = await client.SendAsync(message, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        if ((int)response.StatusCode is >= 300 and < 400) { context.Response.StatusCode = 502; return; }
        // Application JSON only: don't reflect arbitrary HTML, cookies, Location or headers.
        if (response.Content.Headers.ContentType?.MediaType != "application/json" ||
            response.Content.Headers.ContentLength > MaxResponseBody)
        { context.Response.StatusCode = 502; return; }
        // Buffer a bounded response before returning any data, so oversized/failed reads
        // never disclose partial output. The deadline includes body reads, not only headers.
        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var output = new MemoryStream();
        while (true)
        {
            var count = await stream.ReadAsync(buffer.AsMemory(0, Math.Min(buffer.Length, MaxResponseBody + 1 - (int)output.Length)), cancellationToken);
            if (count == 0) break;
            output.Write(buffer, 0, count);
            if (output.Length > MaxResponseBody) { context.Response.StatusCode = 502; return; }
        }
        context.Response.StatusCode = (int)response.StatusCode;
        context.Response.ContentType = "application/json; charset=utf-8";
        await context.Response.Body.WriteAsync(output.ToArray(), cancellationToken);
    }
}
