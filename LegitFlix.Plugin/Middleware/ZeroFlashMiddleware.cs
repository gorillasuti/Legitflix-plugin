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
                var relativePath = path.Substring("/legitflix/client/".Length).TrimStart('/');
                // Normalize path to dot notation for resource matching attempt, though we will search properly
                // Embedded resources: Folder/File -> Folder.File
                // Spaces often become underscores or stay as is depending on compiler, 
                // but usually the best way is to match by suffix or fuzzy match.

                // However, doing a full scan on every request is slow. 
                // Better approach: Try to construct the name, fallback to scan?
                // Or just scan. For a few avatars it's fine. 
                // But wait, there are 2700 assets. Scanning 2700 strings on every image load might be okay but not ideal.
                
                // Let's try to construct the expected resource name first.
                // Standard mapping: / -> .
                var resourcePath = System.Net.WebUtility.UrlDecode(relativePath).Replace('/', '.');
                var expectedName = $"LegitFlix.Plugin.Assets.Client.{resourcePath}";

                // We also need to get the file extension to set content type
                var extension = Path.GetExtension(relativePath).ToLower();
                
                var content = GetEmbeddedFile(expectedName, extension);
                 if (content != null)
                 {
                     if (extension == ".js") context.Response.ContentType = "application/javascript";
                     else if (extension == ".css") context.Response.ContentType = "text/css";
                     else if (extension == ".png") context.Response.ContentType = "image/png";
                     else if (extension == ".jpg" || extension == ".jpeg") context.Response.ContentType = "image/jpeg";
                     else if (extension == ".svg") context.Response.ContentType = "image/svg+xml";

                     await context.Response.Body.WriteAsync(content, 0, content.Length);
                     return;
                 }
            }

            await _next(context);
        }

        private byte[] GetEmbeddedFile(string resourceName, string extension)
        {
            var assembly = Assembly.GetExecutingAssembly();
            
            // Try direct get
            using (var stream = assembly.GetManifestResourceStream(resourceName))
            {
                if (stream != null)
                {
                    return ReadStream(stream);
                }
            }

            // Fallback: The resource name might have different encoding for spaces or special chars.
            // For example "Disney +" might be "Disney__" or "Disney_".
            // We search for a resource that EndsWith the path we asked for.
            // We strip the prefix "LegitFlix.Plugin.Assets.Client." to match against the suffix.
            var suffix = resourceName.Replace("LegitFlix.Plugin.Assets.Client.", "");
            
            // Allow for some fuzziness in standard replace
            // e.g. "avatars.Disney +.img.png" might be "avatars.Disney__.img.png"
            // Let's iterate all resources and match loosely.
            var allResources = assembly.GetManifestResourceNames();
            foreach (var res in allResources)
            {
                if (res.Contains("Assets.Client") && res.Equals(resourceName, System.StringComparison.OrdinalIgnoreCase))
                {
                    using (var stream = assembly.GetManifestResourceStream(res))
                        return ReadStream(stream);
                }
            }

            // Try replacing spaces with underscores (common MSBuild behavior)
            var underscoreName = resourceName.Replace(" ", "_");
            using (var stream = assembly.GetManifestResourceStream(underscoreName))
            {
                if (stream != null) return ReadStream(stream);
            }

            return null;
        }

        private byte[] ReadStream(Stream stream)
        {
            using (var ms = new MemoryStream())
            {
                stream.CopyTo(ms);
                return ms.ToArray();
            }
        }
    }
}
#endif
