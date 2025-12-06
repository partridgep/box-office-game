export const postGuess = async (guessData: Record<string, any>) => {
  const response = await fetch('/api/guess', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify(guessData),
  });

  if (!response.ok) {
      throw new Error('Failed to save guess');
  }

  return response.json();
};


export const getGuessesForUser = async (user_id: string) => {
    console.log("user_id: ", user_id)
  const response = await fetch(`/api/guesses?user_id=${user_id}`);
  console.log("response: ", response)
  if (!response.ok) throw new Error('Failed to fetch guesses for user');
  return response.json();
};