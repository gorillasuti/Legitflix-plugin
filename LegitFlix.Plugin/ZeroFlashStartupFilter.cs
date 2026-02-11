using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;

namespace LegitFlix.Plugin
{
    /// <summary>
    /// Injects the ZeroFlashMiddleware at the very beginning of the ASP.NET Core pipeline.
    /// This ensures our middleware runs BEFORE Jellyfin's own static file / SPA middleware,
    /// so the custom UI is served without any flash of the default UI.
    /// </summary>
    public class ZeroFlashStartupFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
        {
            return app =>
            {
                // Insert our middleware at the top of the pipeline
                app.UseMiddleware<ZeroFlashMiddleware>();

                // Then continue with the rest of Jellyfin's pipeline
                next(app);
            };
        }
    }
}
