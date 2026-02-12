import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LegacyRouteHandler = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const hash = window.location.hash;

        // Handle Legacy Jellyfin Deep Links
        if (hash.startsWith('#!/')) {
            console.log('[LegitFlix] Intercepted legacy hash:', hash);

            // 1. Details Page: #!/details?id=ITEM_ID
            if (hash.includes('details?id=')) {
                const params = new URLSearchParams(hash.split('?')[1]);
                const id = params.get('id');
                if (id) {
                    navigate(`/item/${id}`);
                    return;
                }
            }

            // 2. Settings / Preferences -> Redirect to our Profile page
            const settingsPages = ['mypreferencesmenu', 'user', 'settings'];
            if (settingsPages.some(page => hash.includes(page))) {
                console.log('[LegitFlix] Redirecting settings hash to /profile:', hash);
                navigate('/profile');
                return;
            }

            // 3. Login / Logout / Select Server
            if (hash.includes('selectserver.html') || hash.includes('login.html')) {
                console.log('[LegitFlix] Redirecting auth hash to /login/select-user:', hash);
                navigate('/login/select-user');
                return;
            }

            // 4. Admin Dashboard / Plugins -> Fallback to Classic
            const classicPages = ['dashboard', 'plugins', 'wizard', 'scheduledtasks'];
            if (classicPages.some(page => hash.includes(page))) {
                console.log('[LegitFlix] Redirecting to Classic Mode for:', hash);
                // Force a hard reload to ensure we break out of the React app
                window.location.replace(`/?classic=true${hash}`);
                return;
            }
        }
    }, [navigate]);

    return null;
};

export default LegacyRouteHandler;
