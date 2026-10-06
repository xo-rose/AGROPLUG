/**
 * AuthBar - Inline authentication bar with progress and social icons
 * Shows progress bar with social sign-in icons directly on the right
 * Opens sign-in in popup window (same as top nav)
 * Location: /lib/account/auth-bar.js
 */

(function() {
  if (window.AuthBar) return;

  var AuthBar = {
    _styleId: 'auth-bar-style',
    _baseUrl: 'https://profile.w3schools.com',
    _authUrl: 'https://auth.w3spaces.com',
    _cognitoClientId: 'd1grqml0emh7votkb0gtrrn0'
  };

  // Note: Using AWS Cognito OAuth flow (same as top nav)
  // This avoids Google One Tap origin restrictions on localhost

  // Social provider icon buttons (compact, icon-only) - same icons as topnav
  var SocialIcons = {
    google: {
      icon: '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>',
      bgColor: '#fff',
      borderColor: '#ddd'
    },
    facebook: {
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#0080ff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
      bgColor: '#fff',
      borderColor: '#ddd'
    },
    github: {
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.00194 0C13.9726 0 18.0019 4.13093 18.0019 9.22763C18.0019 13.3037 15.4261 16.7615 11.8522 17.9828C11.3959 18.0737 11.2339 17.7856 11.2339 17.5399C11.2339 17.2357 11.2447 16.2421 11.2447 15.0073C11.2447 14.1469 10.9567 13.5854 10.6336 13.2992C12.6379 13.0706 14.7439 12.2902 14.7439 8.74599C14.7439 7.73799 14.3947 6.91543 13.8169 6.26923C13.9105 6.03613 14.2192 5.09755 13.7287 3.82675C13.7287 3.82675 12.9745 3.5795 11.2564 4.77289C10.5373 4.56859 9.76694 4.4658 9.00194 4.4622C8.23694 4.4658 7.46745 4.56859 6.74925 4.77289C5.02935 3.5795 4.27335 3.82675 4.27335 3.82675C3.78465 5.09755 4.09335 6.03613 4.18605 6.26923C3.61095 6.91543 3.25905 7.73799 3.25905 8.74599C3.25905 12.2812 5.36055 13.0735 7.35945 13.3066C7.10205 13.537 6.86895 13.9435 6.78795 14.5402C6.27495 14.776 4.97175 15.1841 4.16895 13.7738C4.16895 13.7738 3.69285 12.8871 2.78925 12.8223C2.78925 12.8223 1.91175 12.8107 2.72805 13.3831C2.72805 13.3831 3.31755 13.6666 3.72705 14.7331C3.72705 14.7331 4.25535 16.3801 6.75915 15.8221C6.76365 16.5934 6.77175 17.3203 6.77175 17.5399C6.77175 17.7838 6.60614 18.0692 6.15704 17.9837C2.58045 16.7642 0.00195312 13.3046 0.00195312 9.22763C0.00195312 4.13093 4.03215 0 9.00194 0Z" fill="#282A35"/></svg>',
      bgColor: '#fff',
      borderColor: '#ddd'
    },
  };

  // Inject CSS
  AuthBar._injectCss = function() {
    if (document.getElementById(AuthBar._styleId)) return;

    var css = `
      .auth-bar-container {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: nowrap;
      }
      .auth-bar-progress-section {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .auth-bar-progress-wrapper {
        flex: 1;
        position: relative;
      }
      .auth-bar-progress-track {
        background-color: #E7E9EB;
        border-radius: 10px;
        height: 10px;
        overflow: hidden;
      }
      .auth-bar-progress-fill {
        height: 100%;
        background-color: #04AA6D;
        border-radius: 10px;
        transition: width 0.3s ease;
        min-width: 4px;
      }
      .auth-bar-icon-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 1px solid;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.2s;
        flex-shrink: 0;
      }
      .auth-bar-icon-btn:hover {
        transform: scale(1.15);
        box-shadow: 0 3px 8px rgba(0,0,0,0.18);
        border-color: #aaa !important;
      }
      .auth-bar-socials {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .auth-bar-google-container {
        display: inline-block;
        height: 28px;
        flex-shrink: 0;
      }
      .auth-bar-divider {
        width: 1px;
        height: 20px;
        background: #ddd;
        margin: 0 4px;
        flex-shrink: 0;
      }
      .auth-bar-signin-text {
        font-size: 14px;
        color: #04AA6D;
        text-decoration: none;
        font-weight: 600;
        white-space: nowrap;
        flex-shrink: 0;
        cursor: pointer;
      }
      .auth-bar-signin-text:hover {
        color: #059862;
        text-decoration: underline;
      }
      .auth-bar-more-link {
        font-size: 12px;
        color: #666;
        text-decoration: none;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .auth-bar-more-link:hover {
        color: #04AA6D;
        text-decoration: underline;
      }
      /* Compact inline modal for email/other options */
      .auth-bar-mini-modal {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 8px;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 12px;
        min-width: 200px;
        z-index: 1000;
      }
      .auth-bar-mini-modal::before {
        content: '';
        position: absolute;
        top: -6px;
        right: 20px;
        width: 12px;
        height: 12px;
        background: #fff;
        transform: rotate(45deg);
        box-shadow: -2px -2px 4px rgba(0,0,0,0.05);
      }
    `;

    var style = document.createElement('style');
    style.id = AuthBar._styleId;
    style.textContent = css;
    document.head.appendChild(style);
  };

  // Generate state parameter for OAuth security
  AuthBar._generateState = function() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var result = '';
    for (var i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Open OAuth popup (same as top nav)
  AuthBar._openOAuthPopup = function(url, returnUrl) {
    // Set redirect cookie (same as top nav)
    document.cookie = 'socialLoginRedirectUrl=' + encodeURIComponent(returnUrl) + '; path=/; domain=.w3schools.com; secure; samesite=strict';
    
    var width = 450;
    var height = 450;
    var left = (window.innerWidth - width) / 2;
    var top = (window.innerHeight - height) / 2;
    
    var popup = window.open(url, '_blank', 'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',popup=1');
    
    // Fallback to redirect if popup blocked
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      window.location.href = url;
    }
  };

  // Open login dropdown (uses top nav if available, falls back to popup)
  AuthBar._openLogin = function(returnUrl) {
    // Use top nav login dropdown if available
    if (typeof TopNavBar !== 'undefined' && typeof TopNavBar.showLoginDropdown === 'function') {
      TopNavBar.showLoginDropdown();
      return;
    }
    
    // Fallback: open in new tab
    var url = AuthBar._baseUrl + '/log-in?redirect_url=' + encodeURIComponent(returnUrl);
    window.open(url, '_blank');
  };

  // Render social icon button using Cognito OAuth (same as top nav)
  AuthBar._renderSocialIcon = function(provider, returnUrl) {
    var cfg = SocialIcons[provider];
    // Map provider names to Cognito identity provider names
    var identityProvider = {
      'google': 'Google',
      'facebook': 'Facebook',
      'github': 'Github'
    }[provider] || provider;
    
    var state = AuthBar._generateState();
    var redirectUri = encodeURIComponent(AuthBar._baseUrl + '/social-login');
    var finalReturnUrl = encodeURIComponent(returnUrl);
    
    var href = AuthBar._authUrl + '/oauth2/authorize' +
               '?redirect_uri=' + redirectUri +
               '&response_type=code' +
               '&client_id=' + AuthBar._cognitoClientId +
               '&identity_provider=' + identityProvider +
               '&scope=openid%20aws.cognito.signin.user.admin' +
               '&state=' + state + 
               '&final_return=' + finalReturnUrl;
    
    // Use onclick to open popup instead of href
    var onclick = 'event.preventDefault(); AuthBar._openOAuthPopup(\'' + href + '\', \'' + returnUrl + '\');';
    
    return '<a href="' + href + '" ' +
           'onclick="' + onclick + '" ' +
           'class="auth-bar-icon-btn ga-featured ga-authbar-' + provider + '" ' +
           'style="background:' + cfg.bgColor + ';border-color:' + cfg.borderColor + '" ' +
           'title="Sign in with ' + provider.charAt(0).toUpperCase() + provider.slice(1) + '">' +
           cfg.icon +
           '</a>';
  };

  // Render the auth bar inline
  AuthBar.render = function(containerId, options) {
    options = options || {};
    AuthBar._injectCss();

    var container = document.getElementById(containerId);
    if (!container) {
      console.error('AuthBar: Container not found:', containerId);
      return;
    }

    var progress = options.progress || 5;
    var returnUrl = options.returnUrl || window.location.href;

    var html = '<div class="auth-bar-container">';
    
    // Progress bar section (left side)
    html += '<div class="auth-bar-progress-section">';
    html += '<div class="auth-bar-progress-wrapper">';
    html += '<div class="auth-bar-progress-track">';
    html += '<div class="auth-bar-progress-fill" style="width:' + progress + '%"></div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Social icons section (right side)
    html += '<div class="auth-bar-socials">';
    
    // Sign in text link (opens top nav dropdown or popup)
    // Use data attribute to store returnUrl safely, then handle click
    var encodedUrl = encodeURIComponent(returnUrl);
    html += '<a href="' + AuthBar._baseUrl + '/log-in?redirect_url=' + encodedUrl + '" ' +
            'onclick="event.preventDefault();window.open(this.href,\'_blank\');return false;" ' +
            'class="auth-bar-signin-text ga-featured ga-authbar-signin" ' +
            'title="Sign in to track your progress">' +
            'Sign in' +
            '</a>' +
            '<span style="font-size:14px;white-space:nowrap;"> to track your progress</span>';
    
    html += '<span class="auth-bar-divider"></span>';
    
    // Google (regular OAuth, no One Tap due to origin restrictions)
    html += AuthBar._renderSocialIcon('google', returnUrl);
    
    // Facebook
    html += AuthBar._renderSocialIcon('facebook', returnUrl);
    
    // GitHub
    html += AuthBar._renderSocialIcon('github', returnUrl);
    
    html += '</div>'; // end socials
    html += '</div>'; // end container

    container.innerHTML = html;
  };

  // Note: Google One Tap removed for AuthBar due to origin mismatch issues on localhost
  // Using regular OAuth links instead, same as top nav

  window.AuthBar = AuthBar;
})();
