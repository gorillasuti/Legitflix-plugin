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
        // In a real plugin scenario, window.ApiClient is available.
        // In dev, we might need to fetch public users or use env.
        if (window.ApiClient) {
            try {
                return await window.ApiClient.getCurrentUser();
            } catch (e) {
                console.warn("Failed to get current user from window.ApiClient", e);
            }
        }
        // Fallback for dev: try to get public users or just use the first one
        // This is a bit hacky for dev but necessary if we don't have a login flow yet.
        try {
            const users = await this.api.user.getPublicUsers();
            if (users.data && users.data.length > 0) return users.data[0];
        } catch (e) {
            console.warn("Failed to get public users", e);
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
