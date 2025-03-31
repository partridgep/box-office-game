import { useEffect, useState } from "react";
import { saveUser } from '../services/users.service';
import { v4 as uuidv4 } from "uuid";

interface User {
  id: string;
  short_id: string;
  access_key: string;
  name: string;
}

const generateShortId = (name: string) => {
  return name.toUpperCase().replace(/\s/g, "") + Math.floor(Math.random() * 1000);
};

export function useUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const createUser = async (name: string) => {
    const id = uuidv4();
    const access_key = Math.random().toString(36).substr(2, 8).toUpperCase();
    const short_id = generateShortId(name);

    const newUser: User = { id, short_id, access_key, name };
    
    console.log(newUser)
    
    // Send to backend
    let userResponse = await saveUser(newUser);
    console.log(userResponse);
    if (userResponse) {
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser(newUser);
    }
  };

  return { user, createUser };
}
