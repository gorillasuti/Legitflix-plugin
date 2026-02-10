using System;
using System.Threading.Tasks;
using LegitFlix.Plugin.Middleware;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Controller.Plugins; // IServerEntryPoint

namespace LegitFlix.Plugin
{
    public class ServerEntryPoint : IServerEntryPoint
    {
        public Task RunAsync()
        {
            return Task.CompletedTask;
        }

        public void Dispose()
        {
        }
    }

    // Startup Filter to inject Middleware
    // Note: In newer Jellyfin versions, plugins might register services via IPluginServiceRegistrator or similar.
    // But commonly IStartupFilter is used in DI.
    // We need to implement a way to register the middleware.
    // Since this is a simple class lib, we might need to rely on standard DI if Jellyfin scans for it,
    // or register it manually.
    // Simplest approach for plugins: check if we can register services.
    // Jellyfin 10.8+ supports IPluginServiceRegistrator.
}
