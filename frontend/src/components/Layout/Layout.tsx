import { ReactNode } from 'react';
import { useState } from "react";
import { useUserStore } from '../../store/useUserStore';
import RecoverAccount from "../RecoverAccount/RecoverAccount"
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const user = useUserStore((state) => state.user);
  const [showingLoginDialog, showLoginDialog] = useState(false);
  const logout = useUserStore((s) => s.logout);

  function toggleLoginDialog() {
    console.log("show login")
    showLoginDialog(true)
  }

  return (
    <div className={styles['layout']}>
      {/* Header */}
      <header>
        <div className={styles['user-greeting']}>
            {user ? (
              <div>
                <p>Hello, {user.name}</p>
                <button onClick={logout}>Log out</button>
              </div>
            ) : (
            <button onClick={toggleLoginDialog}>Restore Access</button>
            )}
        </div>
      </header>

      {
        showingLoginDialog &&
        <div>
          <RecoverAccount
            onClose={() => showLoginDialog(false)}
          />

        </div>
      }

      <main>{children}</main>


    </div>
  );
}
