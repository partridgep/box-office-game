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