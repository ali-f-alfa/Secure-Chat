import { createContext } from 'react';

const AuthContext = createContext({
  user: null,
  token: null,
  login: () => {},
  logout: () => {}
});

export default AuthContext;