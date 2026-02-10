import { Jellyfin } from '@jellyfin/sdk';

class JellyfinService {
    constructor() {
        this.jellyfin = new Jellyfin({
            clientInfo: { name: 'LegitFlix Client', version: '1.0.0' },
            deviceInfo: { name: 'LegitFlix Web', id: 'legitflix-web' }
        });

        // Use relative path for proxy to work, or env var if provided (but proxy handles relative)
        // Actually, sdk needs full URL usually?
        // If we use proxy, we can just use current origin if deployed, or localhost:5173 which proxies.
        // But SDK might try to detect.
        // Let's use the standard creating method.
        this.api = null;
    }

    initialize() {
        // If we are in development, we might use the proxy. 
        // We can just point to / and let vite proxy handle it?
        // But SDK constructs URLs.
        // If we pass empty string, it might work relative.
        this.api = this.jellyfin.createApi('');
    }

    async getItem(userId, itemId) {
        if (!this.api) this.initialize();
        // SDK uses axios or fetch. Proxy key is setup in vite.
        return this.api.userLibrary.getItem({ userId, itemId });
    }

    async getSimilarItems(userId, itemId) {
        if (!this.api) this.initialize();
        return this.api.library.getSimilarItems({ userId, itemId, limit: 12 });
    }

    async getItems(userId, query) {
        if (!this.api) this.initialize();
        // The SDK might have different signatures, let's use the generic getItems
        // query is an object matching the API params
        return this.api.items.getItems({ userId, ...query });
    }

    async getNextUp(userId, seriesId) {
        if (!this.api) this.initialize();
        return this.api.tvShows.getNextUp({ userId, seriesId, limit: 1 });
    }

    async getCurrentUser() {
        if (!this.api) this.initialize();

        // 1. Try Window API (in case we are ever injected)
        if (window.ApiClient) {
            try {
                return await window.ApiClient.getCurrentUser();
            } catch (e) {
                console.warn("Failed to get current user from window.ApiClient", e);
            }
        }

        // 2. Try LocalStorage (Same Origin)
        const storedCreds = localStorage.getItem('jellyfin_credentials');
        if (storedCreds) {
            try {
                const parsed = JSON.parse(storedCreds);
                if (parsed.Servers && parsed.Servers.length > 0) {
                    // Find the first server with an access token (usually the active one)
                    const activeServer = parsed.Servers.find(s => s.AccessToken && s.UserId);
                    if (activeServer) {
                        console.log("[LegitFlix] Found credentials in localStorage", activeServer);

                        // Re-initialize API with the token
                        this.jellyfin = new Jellyfin({
                            clientInfo: { name: 'LegitFlix Client', version: '1.0.0.9' },
                            deviceInfo: { name: 'LegitFlix Web', id: 'legitflix-web' }
                        });

                        // Create API with the token!
                        this.api = this.jellyfin.createApi(
                            window.location.origin, // Use current origin
                            activeServer.AccessToken
                        );

                        // Fetch the user object
                        return this.api.user.getUser(activeServer.UserId);
                    }
                }
            } catch (e) {
                console.error("Failed to parse jellyfin_credentials", e);
            }
        } else {
            console.warn("[LegitFlix] No credentials found in localStorage. Please login to Jellyfin first.");
        }

        return null;
    }
    async getUserViews(userId) {
        if (!this.api) this.initialize();
        return this.api.userViews.getUserViews({ userId });
    }

    async getSeasons(userId, seriesId) {
        if (!this.api) this.initialize();
        // SDK: tvShows.getSeasons({ seriesId, userId, fields: ... })
        return this.api.tvShows.getSeasons({
            userId,
            seriesId,
            fields: ['ItemCounts', 'PrimaryImageAspectRatio']
        });
    }

    async getEpisodes(userId, seriesId, seasonId) {
        if (!this.api) this.initialize();
        return this.api.tvShows.getEpisodes({
            userId,
            seriesId,
            seasonId,
            fields: ['Overview', 'PrimaryImageAspectRatio', 'UserData', 'RunTimeTicks', 'MediaSources']
        });
    }

    async getSeries(userId, seriesId) {
        if (!this.api) this.initialize();
        // Fetch specific fields for the series detail page
        const fields = ['Overview', 'Genres', 'Studios', 'OfficialRating', 'CommunityRating', 'ImageTags', 'BackdropImageTags', 'People', 'RemoteTrailers', 'ChildCount', 'MediaSources'];
        return this.api.userLibrary.getItem({
            userId,
            itemId: seriesId,
            fields: fields
        });
    }
}

export const jellyfinService = new JellyfinService();
