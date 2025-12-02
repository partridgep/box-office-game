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