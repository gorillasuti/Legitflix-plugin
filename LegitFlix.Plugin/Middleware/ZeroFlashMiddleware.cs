#if false
using System.IO;
using System.Reflection;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace LegitFlix.Plugin.Middleware
{
    public class ZeroFlashMiddleware
    {
        private readonly RequestDelegate _next;

        public ZeroFlashMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task Invoke(HttpContext context)
        {
            var path = context.Request.Path.Value?.ToLower();

            // Intercept main page requests
            if (path == "/" || path == "/web/" || path == "/web/index.html")
            {
                // Backdoor to access original UI
                if (context.Request.Query.ContainsKey("classic"))
                {
                    await _next(context);
                    return;
                }

                // Serve Embedded React App
                context.Response.ContentType = "text/html";
                var html = GetEmbeddedFile("LegitFlix.Plugin.Assets.Client.index.html");
                if (string.IsNullOrEmpty(html))
                {
                    // Fallback if build not ready
                    await context.Response.WriteAsync("<h1>LegitFlix UI is building...</h1>");
                    return;
                }

                await context.Response.WriteAsync(html);
                return;
            }

            // Also serve static assets (js, css) if they match our pattern
            // or if we want to intercept /web/assets etc.
            // For simplicity, let's assume we might need to serve /LegitFlix/Client/* paths 
            // if we set base href in Vite.
            if (path.StartsWith("/legitflix/client/"))
            {
                var fileName = Path.GetFileName(path);
                // Try to find in assets
                // Recursively search or map known files?
                // Manifest based?
                // For now, simple mapping for app.js and style.css
                var resourceName = $"LegitFlix.Plugin.Assets.Client.{fileName}";
                 var content = GetEmbeddedFile(resourceName); // This reads as string, but binaries (images) need stream.
                 // For JS/CSS string is fine usually.
                 if (content != null)
                 {
                     if (fileName.EndsWith(".js")) context.Response.ContentType = "application/javascript";
                     if (fileName.EndsWith(".css")) context.Response.ContentType = "text/css";
                     await context.Response.WriteAsync(content);
                     return;
                 }
            }

            await _next(context);
        }

        private string GetEmbeddedFile(string resourceName)
        {
            var assembly = Assembly.GetExecutingAssembly();
            using (var stream = assembly.GetManifestResourceStream(resourceName))
            {
                if (stream == null) return null;
                using (var reader = new StreamReader(stream))
                {
                    return reader.ReadToEnd();
                }
            }
        }
    }
}
#endif
