using MediaBrowser.Model.Plugins;

namespace LegitFlix.Plugin.Configuration
{
    public class PluginConfiguration : BasePluginConfiguration
    {
        public string PrimaryColor { get; set; } = "#00a4dc";
        public string AccentColor { get; set; } = "#ff0000";
        public bool EnableCustomUI { get; set; } = true;
    }
}
