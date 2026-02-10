import { Jellyfin } from '@jellyfin/sdk';
import { UserApi } from '@jellyfin/sdk/lib/generated-client/api/user-api';
import { UserLibraryApi } from '@jellyfin/sdk/lib/generated-client/api/user-library-api';
import { UserViewsApi } from '@jellyfin/sdk/lib/generated-client/api/user-views-api';
import { ItemsApi } from '@jellyfin/sdk/lib/generated-client/api/items-api';
import { TvShowsApi } from '@jellyfin/sdk/lib/generated-client/api/tv-shows-api';
import { LibraryApi } from '@jellyfin/sdk/lib/generated-client/api/library-api';

class JellyfinService {
    constructor() {
        this.jellyfin = new Jellyfin({
            clientInfo: { name: 'LegitFlix Client', version: '1.0.0.10' },
            deviceInfo: { name: 'LegitFlix Web', id: 'legitflix-web' }
        });
        this.api = null;
    }

    initialize(accessToken = null) {
        // Create base API
        // If accessToken is provided, use current origin, otherwise empty (proxy/dev)
        this.api = this.jellyfin.createApi(
            accessToken ? window.location.origin : '',
            accessToken
        );

        // Attach specific APIs to `this.api` to match existing usage
        // This allows `this.api.user.getUser(...)` to work
        this.api.user = new UserApi(this.api.configuration);
        this.api.userLibrary = new UserLibraryApi(this.api.configuration);
        this.api.userViews = new UserViewsApi(this.api.configuration);
        this.api.items = new ItemsApi(this.api.configuration);
        this.api.tvShows = new TvShowsApi(this.api.configuration);
        this.api.library = new LibraryApi(this.api.configuration);

        console.log("[LegitFlix] API Initialized. Access Token present:", !!accessToken);
    }

    async getCurrentUser() {
        // 1. Try Window API (in case we are ever injected)
        if (window.ApiClient) {
            try {
                return await window.ApiClient.getCurrentUser();
            } catch (e) {
                console.warn("Failed to get current user from window.ApiClient", e);
            }
        }

        // 2. Try LocalStorage (Same Origin) / Re-auth
        if (!this.api || !this.api.accessToken) {
            const storedCreds = localStorage.getItem('jellyfin_credentials');
            if (storedCreds) {
                try {
                    const parsed = JSON.parse(storedCreds);
                    if (parsed.Servers && parsed.Servers.length > 0) {
                        const activeServer = parsed.Servers.find(s => s.AccessToken && s.UserId);
                        if (activeServer) {
                            console.log("[LegitFlix] Found credentials in localStorage", activeServer);
                            this.initialize(activeServer.AccessToken);
                            return this.api.user.getUser(activeServer.UserId);
                        }
                    }
                } catch (e) {
                    console.error("[LegitFlix] Failed to parse jellyfin_credentials", e);
                }
            }
        }

        // 3. Already initialized?
        if (this.api && this.api.accessToken) {
            // We return null here because we need the User ID to fetch the user.
            // But we don't store it.
            // If we initiated from localStorage, we returned above.
            return null;
        }

        // 4. Fallback (Dev/Public)
        if (!this.api) this.initialize();

        try {
            const users = await this.api.user.getPublicUsers();
            if (users.data && users.data.length > 0) return users.data[0];
        } catch (e) {
            console.warn("[LegitFlix] Failed to get public users", e);
        }

        return null;
    }

    async getItem(userId, itemId) {
        if (!this.api) this.initialize();
        return this.api.userLibrary.getItem({ userId, itemId });
    }

    async getSimilarItems(userId, itemId) {
        if (!this.api) this.initialize();
        return this.api.library.getSimilarItems({ userId, itemId, limit: 12 });
    }

    async getItems(userId, query) {
        if (!this.api) this.initialize();
        return this.api.items.getItems({ userId, ...query });
    }

    async getNextUp(userId, seriesId) {
        if (!this.api) this.initialize();
        return this.api.tvShows.getNextUp({ userId, seriesId, limit: 1 });
    }

    async getUserViews(userId) {
        if (!this.api) this.initialize();
        return this.api.userViews.getUserViews({ userId });
    }

    async getSeasons(userId, seriesId) {
        if (!this.api) this.initialize();
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
        const fields = ['Overview', 'Genres', 'Studios', 'OfficialRating', 'CommunityRating', 'ImageTags', 'BackdropImageTags', 'People', 'RemoteTrailers', 'ChildCount', 'MediaSources'];
        return this.api.userLibrary.getItem({
            userId,
            itemId: seriesId,
            fields: fields
        });
    }
}

export const jellyfinService = new JellyfinService();
