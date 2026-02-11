using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace LegitFlix.Plugin
{
    /// <summary>
    /// Registers plugin services with Jellyfin's DI container.
    /// This is discovered automatically by Jellyfin at startup.
    /// </summary>
    public class PluginServiceRegistrator : IPluginServiceRegistrator
    {
        /// <summary>
        /// Called by Jellyfin during startup to register services.
        /// We register our IStartupFilter so the Zero-Flash middleware is injected into the pipeline.
        /// </summary>
        public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
        {
            serviceCollection.AddTransient<IStartupFilter, ZeroFlashStartupFilter>();
        }
    }
}
