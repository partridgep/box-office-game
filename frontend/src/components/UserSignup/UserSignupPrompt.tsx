import { useState } from "react";
import { useUser } from "../../hooks/useUser";

export default function UserSignup({ onSignup }: { onSignup?: () => void }) {
  const { createUser } = useUser();
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      await createUser(name);
      onSignup && onSignup();
    }
  };

  return (
    <div className="p-4">
      <h2>Welcome! Enter your name to get started:</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2"
          required
        />
        <button type="submit" className="bg-green-500 text-white p-2 rounded">
          Continue
        </button>
      </form>
    </div>
  );
}
