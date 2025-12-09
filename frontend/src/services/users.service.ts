export const saveUser = async (newUser: Record<string, any>) => {
  console.log(newUser)
  const response = await fetch('/api/users/save', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUser),
  });

  if (!response.ok) {
      throw new Error('Failed to save user');
  }

  return response.json();
};

export const loginUser = async (
    name: string,
    access_key: string
) => {
  const response = await fetch('/api/users/recover', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, access_key }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not find user");
  }

  return data;
};