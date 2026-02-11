using System.IO;
using System.Reflection;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace LegitFlix.Plugin
{
    /// <summary>
    /// Middleware that intercepts requests to the Jellyfin web root and serves the
    /// custom LegitFlix client instead — achieving a "Zero-Flash" UI replacement.
    /// The original Jellyfin UI is never sent to the browser.
    /// Pass ?classic=true to bypass and load the stock Jellyfin UI.
    /// </summary>
    public class ZeroFlashMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ZeroFlashMiddleware> _logger;

        // Cache the HTML in memory so we only read the embedded resource once.
        private readonly string? _cachedHtml;

        public ZeroFlashMiddleware(RequestDelegate next, ILogger<ZeroFlashMiddleware> logger)
        {
            _next = next;
            _logger = logger;
            _cachedHtml = LoadEmbeddedHtml();

            if (_cachedHtml != null)
            {
                _logger.LogInformation("[LegitFlix] Zero-Flash middleware active. Custom UI will be served at /");
            }
            else
            {
                _logger.LogWarning("[LegitFlix] Zero-Flash middleware: Could not find embedded index.html. Falling through to default Jellyfin UI.");
            }
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var path = context.Request.Path.Value?.TrimEnd('/').ToLowerInvariant();

            // Normalize empty path
            if (string.IsNullOrEmpty(path))
            {
                path = string.Empty;
            }

            // Only intercept the root entry points that would load Jellyfin Web
            bool isEntryPoint = path == string.Empty
                             || path == "/web"
                             || path == "/web/index.html";

            if (isEntryPoint && _cachedHtml != null)
            {
                // Safety hatch: ?classic=true bypasses and loads the stock Jellyfin UI
                if (context.Request.Query.ContainsKey("classic"))
                {
                    _logger.LogInformation("[LegitFlix] Classic mode requested, passing through to Jellyfin.");
                    await _next(context);
                    return;
                }

                // Serve the custom UI immediately — Jellyfin's pipeline never runs for this request.
                context.Response.StatusCode = 200;
                context.Response.ContentType = "text/html; charset=utf-8";
                await context.Response.WriteAsync(_cachedHtml);
                return;
            }

            // Everything else (API calls, images, video streams, plugin resources) passes through.
            await _next(context);
        }

        /// <summary>
        /// Reads the embedded index.html from the DLL at startup.
        /// The resource name follows the pattern: {DefaultNamespace}.{FolderPath}.{FileName}
        /// with dots replacing directory separators.
        /// </summary>
        private static string? LoadEmbeddedHtml()
        {
            var assembly = Assembly.GetExecutingAssembly();
            // Resource path: LegitFlix.Plugin.Assets.Client.index.html
            var resourceName = "LegitFlix.Plugin.Assets.Client.index.html";

            using var stream = assembly.GetManifestResourceStream(resourceName);
            if (stream == null)
            {
                return null;
            }

            using var reader = new StreamReader(stream);
            return reader.ReadToEnd();
        }
    }
}
