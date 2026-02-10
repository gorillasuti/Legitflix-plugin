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
            clientInfo: { name: 'LegitFlix Client', version: '1.0.0.12' },
            deviceInfo: { name: 'LegitFlix Web', id: 'legitflix-web' }
        });
        this.api = null;
    }

    initialize(accessToken = null) {
        this.api = this.jellyfin.createApi(
            accessToken ? window.location.origin : '',
            accessToken
        );

        this.api.user = new UserApi(this.api.configuration);
        this.api.userLibrary = new UserLibraryApi(this.api.configuration);
        this.api.userViews = new UserViewsApi(this.api.configuration);
        this.api.items = new ItemsApi(this.api.configuration);
        this.api.tvShows = new TvShowsApi(this.api.configuration);
        this.api.library = new LibraryApi(this.api.configuration);

        console.log("[LegitFlix] API Initialized. Access Token present:", !!accessToken);
    }

    async getCurrentUser() {
        if (window.ApiClient) {
            try {
                return await window.ApiClient.getCurrentUser();
            } catch (e) {
                console.warn("Failed to get current user from window.ApiClient", e);
            }
        }

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
                            // FIX: Use getUserById with object param, and unwrap .data
                            const response = await this.api.user.getUserById({ userId: activeServer.UserId });
                            return response.data;
                        }
                    }
                } catch (e) {
                    console.error("[LegitFlix] Failed to parse jellyfin_credentials", e);
                }
            }
        }

        if (this.api && this.api.accessToken) {
            // We can't easily get the current user without ID if we only have token here (unless stored)
            return null;
        }

        if (!this.api) this.initialize();

        try {
            // FIX: Unwrap .data
            const users = await this.api.user.getPublicUsers();
            if (users.data && users.data.length > 0) return users.data[0];
        } catch (e) {
            console.warn("[LegitFlix] Failed to get public users", e);
        }

        return null;
    }

    async getItem(userId, itemId) {
        if (!this.api) this.initialize();
        // FIX: Unwrap .data
        const response = await this.api.userLibrary.getItem({ userId, itemId });
        return response.data;
    }

    async getSimilarItems(userId, itemId) {
        if (!this.api) this.initialize();
        // FIX: Unwrap .data
        const response = await this.api.library.getSimilarItems({ userId, itemId, limit: 12 });
        return response.data;
    }

    async getItems(userId, query) {
        if (!this.api) this.initialize();
        // FIX: Unwrap .data
        const response = await this.api.items.getItems({ userId, ...query });
        return response.data;
    }

    async getNextUp(userId, seriesId) {
        if (!this.api) this.initialize();
        // FIX: Unwrap .data
        const response = await this.api.tvShows.getNextUp({ userId, seriesId, limit: 1 });
        return response.data;
    }

    async getUserViews(userId) {
        if (!this.api) this.initialize();
        // FIX: Unwrap .data
        const response = await this.api.userViews.getUserViews({ userId });
        return response.data;
    }

    async getSeasons(userId, seriesId) {
        if (!this.api) this.initialize();
        // FIX: Unwrap .data
        const response = await this.api.tvShows.getSeasons({
            userId,
            seriesId,
            fields: ['ItemCounts', 'PrimaryImageAspectRatio']
        });
        return response.data;
    }

    async getEpisodes(userId, seriesId, seasonId) {
        if (!this.api) this.initialize();
        // FIX: Unwrap .data
        const response = await this.api.tvShows.getEpisodes({
            userId,
            seriesId,
            seasonId,
            fields: ['Overview', 'PrimaryImageAspectRatio', 'UserData', 'RunTimeTicks', 'MediaSources']
        });
        return response.data;
    }

    async getSeries(userId, seriesId) {
        if (!this.api) this.initialize();
        const fields = ['Overview', 'Genres', 'Studios', 'OfficialRating', 'CommunityRating', 'ImageTags', 'BackdropImageTags', 'People', 'RemoteTrailers', 'ChildCount', 'MediaSources'];
        // FIX: Unwrap .data
        const response = await this.api.userLibrary.getItem({
            userId,
            itemId: seriesId,
            fields: fields
        });
        return response.data;
    }
    async getResumeItems(userId, limit = 12) {
        if (!this.api) this.initialize();
        // Uses getItems with filters
        const response = await this.getItems(userId, {
            filters: ['IsResumable'],
            sortBy: ['DatePlayed'],
            sortOrder: ['Descending'],
            limit: limit,
            recursive: true,
            includeItemTypes: ['Movie', 'Episode']
        });
        return response; // getItems already unwraps .data
    }
}

export const jellyfinService = new JellyfinService();
