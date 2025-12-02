import { ReactNode } from 'react';
import { useUserStore } from '../../store/useUserStore';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const user = useUserStore((state) => state.user);

  return (
    <div className={styles['layout']}>
      {/* Header */}
      <header>
        <div className={styles['user-greeting']}>
            {user ? (
                <p>Hello, {user.name}</p>
            ) : (
            <button>Restore Access</button>
            )}
        </div>
      </header>

      {/* Page content */}
      <main>{children}</main>
    </div>
  );
}
