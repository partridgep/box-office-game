import { useUser } from "../../hooks/useUser";

export default function UserProfile() {
  const { user } = useUser();

  return (
    <div className="p-4">
      {user ? (
        <div>
          <h2>Welcome, {user.name}!</h2>
          <p>Your user ID: {user.short_id}</p>
          <p><strong>Secret Access Key:</strong> {user.access_key}</p>
          <p className="text-red-500">Save this key! If you lose access, you'll need it to recover your guesses.</p>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
