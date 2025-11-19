import { createServer } from 'net';

/**
 * Finds a free port on the local machine.
 * Useful for starting servers in tests without port conflicts.
 */
export const getFreePort = (): Promise<number> => {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'string' ? 0 : address?.port;
      server.close(() => {
        if (port) {
          resolve(port);
        } else {
          reject(new Error('Could not determine free port'));
        }
      });
    });
  });
};