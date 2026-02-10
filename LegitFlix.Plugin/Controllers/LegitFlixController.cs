
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace LegitFlix.Plugin.Controllers
{
    [ApiController]
    [Route("LegitFlix")]
    public class LegitFlixController : ControllerBase
    {
        [HttpGet("Debug")]
        public ActionResult GetDebug()
        {
            var assembly = Assembly.GetExecutingAssembly();
            var resources = assembly.GetManifestResourceNames();
            return Ok(resources);
        }

        [HttpGet("Client/{*path}")]
        public ActionResult GetContent([FromRoute] string path)
        {
            if (string.IsNullOrEmpty(path)) path = "index.html";

            // Support both / and . as separators just in case
            // Valid Resource: LegitFlix.Plugin.Assets.Client.index.html
            // Valid Resource: LegitFlix.Plugin.Assets.Client.assets.index-Diw7...js
            
            // If path starts with assets/, it maps to LegitFlix.Plugin.Assets.Client.assets...
            // Standardize path separators
            var normalizedPath = path.Replace("/", ".");
            var resourceName = $"LegitFlix.Plugin.Assets.Client.{normalizedPath}";

            var assembly = Assembly.GetExecutingAssembly();
            var stream = assembly.GetManifestResourceStream(resourceName);

            if (stream == null)
            {
                // Fallback attempt: maybe it wasn't Assets.Client prefix?
                // Try searching for end of string
                var resources = assembly.GetManifestResourceNames();
                var match = resources.FirstOrDefault(r => r.EndsWith($".{normalizedPath}"));
                
                if (match != null)
                {
                    stream = assembly.GetManifestResourceStream(match);
                }
                else
                {
                    // Fallback for React Router (SPA) -> Serve index.html if html not found?
                    // Only if extension is missing or looks like a route
                    if (!path.Contains("."))
                    {
                         resourceName = "LegitFlix.Plugin.Assets.Client.index.html";
                         stream = assembly.GetManifestResourceStream(resourceName);
                    }
                }
            }

            if (stream == null)
                return NotFound($"Resource not found: {resourceName}");

            var contentType = GetContentType(path);
            return File(stream, contentType);
        }

        private string GetContentType(string path)
        {
            if (path.EndsWith(".html")) return "text/html";
            if (path.EndsWith(".js")) return "application/javascript";
            if (path.EndsWith(".css")) return "text/css";
            if (path.EndsWith(".svg")) return "image/svg+xml";
            if (path.EndsWith(".png")) return "image/png";
            if (path.EndsWith(".jpg")) return "image/jpeg";
            if (path.EndsWith(".json")) return "application/json";
            return "application/octet-stream";
        }
    }
}

