import Keycloak from 'keycloak-js';
import token from './token';

// Minimum number of seconds left of token before a refresh is needed
const minValiditySeconds = 60;

// How often should lib check for valid token
const refreshRateMs = 60 * 1000;

const initAuth = (onFirstToken, onNewToken) => {
  const kc = new Keycloak('/keycloak.json');
  const options = { checkLoginIframe: false };
  kc.init(options).success(authenticated => {
    if (authenticated) {
      token.save(kc.token);
      setInterval(() => {
        kc.updateToken(minValiditySeconds).error(() => kc.logout());
        token.save(kc.token);
        onNewToken(kc.token);
      }, refreshRateMs);
      const userInfo = {
        logoutUrl: kc.createLogoutUrl(options),
        familyName: kc.idTokenParsed.family_name,
        givenName: kc.idTokenParsed.given_name,
        email: kc.idTokenParsed.email,
        username: kc.idTokenParsed.preferred_username,
        roles: kc.tokenParsed.roles
      };

      onFirstToken(kc.token, userInfo);
    } else {
      kc.login();
    }
  });
};

export default { initAuth };
