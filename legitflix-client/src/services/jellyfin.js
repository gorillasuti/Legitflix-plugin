import { Jellyfin } from '@jellyfin/sdk';
import { UserApi } from '@jellyfin/sdk/lib/generated-client/api/user-api';
import { UserLibraryApi } from '@jellyfin/sdk/lib/generated-client/api/user-library-api';
import { UserViewsApi } from '@jellyfin/sdk/lib/generated-client/api/user-views-api';
import { ItemsApi } from '@jellyfin/sdk/lib/generated-client/api/items-api';
import { TvShowsApi } from '@jellyfin/sdk/lib/generated-client/api/tv-shows-api';
import { LibraryApi } from '@jellyfin/sdk/lib/generated-client/api/library-api';
import { SubtitleApi } from '@jellyfin/sdk/lib/generated-client/api/subtitle-api';
import { PlaystateApi } from '@jellyfin/sdk/lib/generated-client/api/playstate-api';

class JellyfinService {
    constructor() {
        this.jellyfin = new Jellyfin({
            clientInfo: { name: 'LegitFlix Client', version: '1.0.0.18' },
            deviceInfo: { name: 'LegitFlix Web', id: 'legitflix-web' }
        });
        this.api = null;
    }

    initialize(accessToken = null, basePath = null) {
        const url = basePath !== null ? basePath : (this.api?.basePath || window.location.origin);

        this.api = this.jellyfin.createApi(
            url,
            accessToken
        );

        this.api.user = new UserApi(this.api.configuration);
        this.api.userLibrary = new UserLibraryApi(this.api.configuration);
        this.api.userViews = new UserViewsApi(this.api.configuration);
        this.api.items = new ItemsApi(this.api.configuration);
        this.api.tvShows = new TvShowsApi(this.api.configuration);
        this.api.library = new LibraryApi(this.api.configuration);
        this.api.subtitle = new SubtitleApi(this.api.configuration);
        this.api.playstate = new PlaystateApi(this.api.configuration);

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

        // Check localStorage for the active user credentials
        const storedCreds = localStorage.getItem('jellyfin_credentials');
        if (storedCreds) {
            try {
                const parsed = JSON.parse(storedCreds);
                if (parsed.Servers && parsed.Servers.length > 0) {
                    const activeServer = parsed.Servers.find(s => s.AccessToken && s.UserId);
                    if (activeServer) {
                        // Ensure API is initialized with the correct token
                        if (!this.api || this.api.accessToken !== activeServer.AccessToken) {
                            console.log("[LegitFlix] Initializing API with stored token");
                            this.initialize(activeServer.AccessToken);
                        }

                        try {
                            const response = await this.api.user.getUserById({ userId: activeServer.UserId });
                            return response.data;
                        } catch (apiError) {
                            console.error("[LegitFlix] Token invalid or user not found. Clearing credentials.", apiError);
                            this.logout(); // Clear invalid creds
                            return null;
                        }
                    }
                }
            } catch (e) {
                console.error("[LegitFlix] Failed to parse jellyfin_credentials", e);
            }
        }

        return null;
    }

    // --- Auth Flow Methods ---

    async validateServer(url) {
        // Strip trailing slash
        const baseUrl = url.replace(/\/$/, "");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        try {
            const response = await fetch(`${baseUrl}/System/Info/Public`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (response.ok) {
                const data = await response.json();
                return { valid: true, data, baseUrl }; // Return cleaned URL
            }
        } catch (e) {
            clearTimeout(timeoutId);
            console.error("Server validation failed", e);
        }
        return { valid: false };
    }

    async getPublicUsers() {
        if (!this.api) this.initialize();
        const response = await this.api.user.getPublicUsers();
        return response.data;
    }

    async authenticateUser(username, password) {
        if (!this.api) this.initialize();
        try {
            const response = await this.api.user.authenticateUserByName({
                authenticateUserByName: {
                    Username: username,
                    Pw: password
                }
            });

            // Save Session
            const authResult = response.data;
            if (authResult.AccessToken && authResult.User) {
                this.initialize(authResult.AccessToken);

                // Store in LocalStorage (Simple format for now)
                const storedData = {
                    Servers: [{
                        DateLastAccessed: new Date().toISOString(),
                        AccessToken: authResult.AccessToken,
                        UserId: authResult.User.Id,
                        Name: authResult.User.Name,
                        ManualAddress: this.api.basePath
                    }]
                };
                localStorage.setItem('jellyfin_credentials', JSON.stringify(storedData));
                return authResult.User;
            }
        } catch (e) {
            console.error("Authentication failed", e);
            throw e;
        }
        return null;
    }

    async getItem(userId, itemId) {
        if (!this.api) this.initialize();
        const response = await this.api.userLibrary.getItem({ userId, itemId });
        return response.data;
    }

    async getSimilarItems(userId, itemId) {
        if (!this.api) this.initialize();
        const response = await this.api.library.getSimilarItems({ userId, itemId, limit: 12 });
        return response.data;
    }

    async getItems(userId, query) {
        if (!this.api) this.initialize();
        const response = await this.api.items.getItems({ userId, ...query });
        return response.data;
    }



    async markPlayed(userId, itemId, isPlayed) {
        if (!this.api) this.initialize();
        const method = isPlayed ? 'POST' : 'DELETE';
        const basePath = this.api.basePath || '';
        const url = `${basePath}/Users/${userId}/PlayedItems/${itemId}`;

        try {
            const token = this.api.accessToken;
            const headers = {
                'Content-Type': 'application/json'
            };

            if (token) {
                headers['X-Emby-Authorization'] = `MediaBrowser Client="${this.jellyfin.clientInfo.name}", Device="${this.jellyfin.deviceInfo.name}", DeviceId="${this.jellyfin.deviceInfo.id}", Version="${this.jellyfin.clientInfo.version}", Token="${token}"`;
            }

            const response = await fetch(url, {
                method: method,
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`Failed to mark played/unplayed: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error("markPlayed failed", error);
            throw error;
        }
    }

    async markFavorite(userId, itemId, isFavorite) {
        if (!this.api) this.initialize();
        if (isFavorite) {
            return await this.api.userLibrary.markFavoriteItem({ userId, itemId });
        } else {
            return await this.api.userLibrary.unmarkFavoriteItem({ userId, itemId });
        }
    }

    async getSeasons(userId, seriesId) {
        if (!this.api) this.initialize();
        const response = await this.api.tvShows.getSeasons({ userId, seriesId });
        return response.data.Items || [];
    }

    async getEpisodes(userId, seriesId, seasonId) {
        if (!this.api) this.initialize();
        const response = await this.api.tvShows.getEpisodes({
            userId,
            seriesId,
            seasonId,
            fields: ['MediaSources', 'RunTimeTicks', 'UserData', 'Overview', 'Path']
        });
        return response.data.Items || [];
    }

    async getNextUp(userId, seriesId) {
        if (!this.api) this.initialize();
        const response = await this.api.tvShows.getNextUp({ userId, seriesId, limit: 1 });
        return response.data;
    }

    async getUserViews(userId) {
        if (!this.api) this.initialize();
        const response = await this.api.userViews.getUserViews({ userId });
        return response.data;
    }

    async getSeries(userId, seriesId) {
        if (!this.api) this.initialize();
        const fields = ['Overview', 'Genres', 'Studios', 'OfficialRating', 'CommunityRating', 'ImageTags', 'BackdropImageTags', 'People', 'RemoteTrailers', 'LocalTrailers', 'ChildCount', 'MediaSources'];
        const response = await this.api.userLibrary.getItem({
            userId,
            itemId: seriesId,
            fields: fields
        });
        return response.data;
    }

    async getResumeItems(userId, limit = 12) {
        if (!this.api) this.initialize();
        const response = await this.getItems(userId, {
            filters: ['IsResumable'],
            sortBy: ['DatePlayed'],
            sortOrder: ['Descending'],
            limit: limit,
            recursive: true,
            includeItemTypes: ['Movie', 'Episode']
        });
        return response;
    }

    async getHistoryItems(userId, limit = 12) {
        if (!this.api) this.initialize();
        const response = await this.getItems(userId, {
            sortBy: ['DatePlayed'],
            sortOrder: ['Descending'],
            limit: limit,
            recursive: true,
            filters: ['IsPlayed'],
            includeItemTypes: ['Movie', 'Episode'],
            fields: ['PrimaryImageAspectRatio', 'Overview', 'ImageTags', 'ProductionYear', 'RunTimeTicks']
        });
        return response;
    }



    async getItemDetails(userId, itemId) {
        if (!this.api) this.initialize();
        try {
            const fields = ['RemoteTrailers', 'LocalTrailers', 'People', 'Studios', 'Genres', 'Overview', 'ProductionYear', 'OfficialRating', 'RunTimeTicks', 'Tags', 'ImageTags', 'MediaStreams', 'UserData', 'MediaSources', 'Trickplay', 'Chapters', 'Width', 'Height'];
            const response = await this.api.userLibrary.getItem({
                userId,
                itemId,
                fields: fields
            });
            return response.data;
        } catch (error) {
            console.error('getItemDetails failed', error);
            return null;
        }
    }

    async getLatestItems(userId, parentId) {
        if (!this.api) this.initialize();
        try {
            const response = await this.api.items.getItems({
                userId,
                parentId,
                sortBy: ['DateCreated'],
                sortOrder: ['Descending'],
                includeItemTypes: ['Movie', 'Series'],
                recursive: true,
                fields: ['PrimaryImageAspectRatio', 'Overview', 'ImageTags', 'ProductionYear', 'RunTimeTicks']
            });
            return response.data;
        } catch (error) {
            console.error('getLatestItems failed', error);
            return { Items: [] };
        }
    }

    getImageUrl(item, type = 'Primary', options = {}) {
        if (!item || !item.Id) return '';
        const { maxWidth = 800, quality = 90 } = options;
        if (!this.api) this.initialize();
        const baseUrl = this.api.configuration.basePath || '';
        const tag = item.ImageTags && item.ImageTags[type] ? `&tag=${item.ImageTags[type]}` : '';
        return `${baseUrl}/Items/${item.Id}/Images/${type}?maxWidth=${maxWidth}&quality=${quality}${tag}`;
    }


    getPlaybackUrl(itemId) {
        // Returns the internal player route (used with react-router HashRouter)
        return `#/play/${itemId}`;
    }

    getStreamUrl(itemId, audioStreamIndex = null, subtitleStreamIndex = null, mediaSourceId = null, maxBitrate = null) {
        if (!this.api) this.initialize();
        const token = this.api.accessToken;
        const deviceId = this.jellyfin.deviceInfo.id;
        const baseUrl = this.api.configuration.basePath;

        let url = `${baseUrl}/Videos/${itemId}/master.m3u8?PlaySessionId=LegitFlix-${Date.now()}&api_key=${token}&DeviceId=${deviceId}&VideoCodec=h264,hevc,vp9,av1&AudioCodec=aac,mp3&TranscodingContainer=fmp4&TranscodingProtocol=hls`;

        if (mediaSourceId) {
            url += `&MediaSourceId=${mediaSourceId}`;
        }

        if (audioStreamIndex !== null) {
            url += `&AudioStreamIndex=${audioStreamIndex}`;
        }

        if (subtitleStreamIndex !== null) {
            url += `&SubtitleStreamIndex=${subtitleStreamIndex}`;
        }

        if (maxBitrate) {
            url += `&VideoBitrate=${maxBitrate}`;
        }

        return url;
    }

    async reportPlaybackProgress(itemId, ticks, isPaused, mediaSourceId) {
        if (!this.api) this.initialize();
        try {
            await this.api.playstate.reportPlaybackProgress({
                playbackProgressInfo: {
                    ItemId: itemId,
                    MediaSourceId: mediaSourceId || itemId,
                    PositionTicks: ticks,
                    IsPaused: isPaused,
                    EventName: 'TimeUpdate'
                }
            });
        } catch (e) {
            console.warn("Report progress failed (silent)", e);
        }
    }

    async reportPlaybackStopped(itemId, ticks) {
        if (!this.api) this.initialize();
        try {
            await this.api.playstate.reportPlaybackStopped({
                playbackStopInfo: {
                    ItemId: itemId,
                    PositionTicks: ticks
                }
            });
        } catch (e) {
            console.warn("Report stop failed (silent)", e);
        }
    }

    // --- Trickplay ---
    async getTrickplayManifest(itemId) {
        if (!this.api) this.initialize();
        const baseUrl = this.api.configuration.basePath || '';
        const token = this.api.accessToken;
        const authHeader = `MediaBrowser Client="LegitFlix Client", Device="LegitFlix Web", DeviceId="legitflix-web", Version="1.0.0.18", Token="${token}"`;
        try {
            const url = `${baseUrl}/Videos/${itemId}/Trickplay`;
            console.log('[Trickplay] Fetching manifest:', url);
            const response = await fetch(url, {
                headers: {
                    'Authorization': authHeader
                }
            });
            if (!response.ok) {
                console.warn('[Trickplay] Manifest fetch failed:', response.status, response.statusText);
                return null;
            }
            const data = await response.json();
            console.log('[Trickplay] Manifest data:', JSON.stringify(data).substring(0, 500));
            return data;
        } catch (e) {
            console.warn("Failed to fetch trickplay manifest", e);
            return null;
        }
    }

    getSubtitleUrl(itemId, mediaSourceId, streamIndex) {
        if (!this.api) this.initialize();
        const baseUrl = this.api.configuration.basePath || '';
        const token = this.api.accessToken;
        return `${baseUrl}/Videos/${itemId}/${mediaSourceId}/Subtitles/${streamIndex}/0/Stream.vtt?api_key=${token}`;
    }

    getRawSubtitleUrl(itemId, mediaSourceId, streamIndex, format) {
        if (!this.api) this.initialize();
        const baseUrl = this.api.configuration.basePath || '';
        const token = this.api.accessToken;
        // Format can be 'srt', 'ass', 'ssa' etc.
        return `${baseUrl}/Videos/${itemId}/${mediaSourceId}/Subtitles/${streamIndex}/0/Stream.${format}?api_key=${token}`;
    }

    getTrickplayTileUrl(itemId, width, index) {
        if (!this.api) this.initialize();
        const baseUrl = this.api.configuration.basePath || '';
        const token = this.api.accessToken;
        return `${baseUrl}/Videos/${itemId}/Trickplay/${width}/${index}.jpg?api_key=${token}`;
    }

    async deleteSubtitle(itemId, index) {
        if (!this.api) this.initialize();
        try {
            // Note: index is usually the MediaStreamIndex
            const response = await this.api.subtitle.deleteSubtitle({ itemId, index });
            return response.data;
        } catch (e) {
            console.error("Failed to delete subtitle", e);
            throw e;
        }
    }

    async searchRemoteSubtitles(itemId, language) {
        if (!this.api) this.initialize();
        try {
            const response = await this.api.subtitle.searchRemoteSubtitles({
                itemId,
                language,
                isPerfectMatch: false
            });
            return response.data;
        } catch (e) {
            console.error("Failed to search subtitles", e);
            return [];
        }
    }

    async downloadRemoteSubtitles(itemId, subtitleId) {
        if (!this.api) this.initialize();
        try {
            const response = await this.api.subtitle.downloadRemoteSubtitles({
                itemId,
                subtitleId
            });
            return response.data;
        } catch (e) {
            console.error("Failed to download subtitle", e);
            throw e;
        }
    }

    async getMediaStreams(userId, itemId) {
        if (!this.api) this.initialize();
        const item = await this.getItemDetails(userId, itemId);
        if (item && item.MediaSources && item.MediaSources[0]) {
            return item.MediaSources[0].MediaStreams || [];
        }
        return [];
    }

    // --- Account Settings Methods ---

    async updatePassword(userId, currentPw, newPw) {
        if (!this.api) this.initialize();
        const response = await fetch(`${this.api.basePath}/Users/${userId}/Password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `MediaBrowser Token="${this.api.accessToken}"`
            },
            body: JSON.stringify({
                CurrentPw: currentPw,
                NewPw: newPw
            })
        });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || 'Failed to update password');
        }
        return true;
    }

    async updateUserConfiguration(userId, config) {
        if (!this.api) this.initialize();
        const response = await fetch(`${this.api.basePath}/Users/${userId}/Configuration`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `MediaBrowser Token="${this.api.accessToken}"`
            },
            body: JSON.stringify(config)
        });
        if (!response.ok) throw new Error('Failed to update user configuration');
        return true;
    }

    async getAllBackdrops(userId, limit = 50) {
        if (!this.api) this.initialize();
        const response = await this.api.items.getItems({
            userId,
            includeItemTypes: ['Movie', 'Series'],
            imageTypes: ['Backdrop'],
            sortBy: ['Random'],
            limit,
            recursive: true,
            fields: ['BackdropImageTags']
        });
        return response.data?.Items || [];
    }

    async getUserViews(userId) {
        if (!this.api) this.initialize();
        const response = await this.api.userViews.getUserViews({ userId });
        return response.data;
    }

    async searchItems(userId, searchTerm, includeItemTypes = [], parentId = null) {
        if (!this.api) this.initialize();
        const query = {
            searchTerm: searchTerm,
            recursive: true,
            fields: ['PrimaryImageAspectRatio', 'ProductionYear', 'DateCreated'],
            includeItemTypes: includeItemTypes,
            limit: 20
        };

        if (parentId && parentId !== 'All') {
            query.parentId = parentId;
        }

        return await this.getItems(userId, query);
    }

    async quickConnect(code) {
        if (!this.api) this.initialize();
        const response = await fetch(`${this.api.basePath}/QuickConnect/Authorize?Code=${code}`, {
            method: 'POST',
            headers: {
                'Authorization': `MediaBrowser Token="${this.api.accessToken}"`
            }
        });
        if (!response.ok) throw new Error('Quick Connect failed. Check the code.');
        return true;
    }

    // --- Quick Connect Login Flow ---

    async initiateQuickConnect() {
        if (!this.api) this.initialize();
        // Public endpoint, no auth needed usually, or uses client auth
        const headers = {
            'X-Emby-Authorization': `MediaBrowser Client="${this.jellyfin.clientInfo.name}", Device="${this.jellyfin.deviceInfo.name}", DeviceId="${this.jellyfin.deviceInfo.id}", Version="${this.jellyfin.clientInfo.version}"`
        };

        const response = await fetch(`${this.api.basePath || ''}/QuickConnect/Initiate`, {
            method: 'POST',
            headers: headers
        });

        if (!response.ok) throw new Error('Failed to initiate Quick Connect');
        return response.json(); // { Code, Secret, Expiry }
    }

    async checkQuickConnectStatus(secret) {
        if (!this.api) this.initialize();
        const response = await fetch(`${this.api.basePath || ''}/QuickConnect/Connect?Secret=${secret}`, {
            method: 'GET'
        });

        if (response.status === 200) {
            const data = await response.json();
            // data contains { Authenticated: true, Secret, AccessToken, UserId, ... }
            if (data.Authenticated) {
                // Save Session
                this.initialize(data.AccessToken);
                const userRes = await this.api.user.getUserById({ userId: data.UserId });

                const storedData = {
                    Servers: [{
                        DateLastAccessed: new Date().toISOString(),
                        AccessToken: data.AccessToken,
                        UserId: userRes.data.Id,
                        Name: userRes.data.Name,
                        ManualAddress: this.api.basePath
                    }]
                };
                localStorage.setItem('jellyfin_credentials', JSON.stringify(storedData));

                return userRes.data;
            }
        }

        return null; // Not authorized yet
    }

    async logout() {
        console.log('[LegitFlix] Logging out...');

        // 1. Try generic ApiClient logout if available (might do server calls)
        if (window.ApiClient) {
            try {
                // Just close session, don't let it redirect yet
                await window.ApiClient.logout();
            } catch (e) {
                console.warn("ApiClient logout failed", e);
            }
        }

        // 2. Clear Local Storage
        localStorage.removeItem('jellyfin_credentials');

        // 3. Clear Instance
        this.api = null;

        // 4. Redirect to Select User
        // This satisfies "Add back support to use my original account" (Switch User)
        window.location.href = '/#/login/select-user';
    }

    async uploadUserImage(userId, type, file) {
        if (!this.api) this.initialize();

        // Ensure we have a valid token
        const token = this.api.accessToken;
        if (!token) throw new Error("No access token available for upload");

        // Jellyfin expects the raw binary in body for image upload
        // Fix 401: Use standard X-Emby-Authorization header with Client/Device info
        const authHeader = `MediaBrowser Client="${this.jellyfin.clientInfo.name}", Device="${this.jellyfin.deviceInfo.name}", DeviceId="${this.jellyfin.deviceInfo.id}", Version="${this.jellyfin.clientInfo.version}", Token="${token}"`;

        const contentType = file.type || 'image/png';
        console.log(`[LegitFlix] Uploading ${type} image. Size: ${file.size}, Type: ${contentType}`);

        const response = await fetch(`${this.api.basePath}/Users/${userId}/Images/${type}`, {
            method: 'POST',
            headers: {
                'Content-Type': contentType,
                'X-Emby-Authorization': authHeader
            },
            body: file,
        });

        if (!response.ok) {
            const txt = await response.text();
            console.error("Upload failed response:", txt);
            throw new Error(`Failed to upload image: ${response.status} ${response.statusText}`);
        }
        return true;
    }

    async deleteUserImage(userId, type) {
        if (!this.api) this.initialize();
        const token = this.api.accessToken;
        if (!token) throw new Error("No access token available for delete");

        const authHeader = `MediaBrowser Client="${this.jellyfin.clientInfo.name}", Device="${this.jellyfin.deviceInfo.name}", DeviceId="${this.jellyfin.deviceInfo.id}", Version="${this.jellyfin.clientInfo.version}", Token="${token}"`;

        const response = await fetch(`${this.api.basePath}/Users/${userId}/Images/${type}`, {
            method: 'DELETE',
            headers: {
                'X-Emby-Authorization': authHeader
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to delete image: ${response.status} ${response.statusText}`);
        }
        return true;
    }
}

const jellyfinService = new JellyfinService();
export { jellyfinService };
export default jellyfinService;
