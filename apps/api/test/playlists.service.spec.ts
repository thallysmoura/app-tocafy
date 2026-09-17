import { ForbiddenException } from '@nestjs/common';
import { PlaylistsService } from '../src/me/playlists.service';

function buildPrismaMock(entries: { trackId: string; position: number }[]) {
  return {
    playlist: {
      findUnique: jest.fn().mockResolvedValue({ id: 'p1', ownerId: 'u1', isPublic: false }),
    },
    playlistTrack: {
      findMany: jest.fn().mockResolvedValue(entries),
      update: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn((ops) => Promise.all(ops)),
  } as any;
}

describe('PlaylistsService.reorder', () => {
  it('calcula posição fracionária entre vizinhos', async () => {
    const entries = [
      { trackId: 'a', position: 1024 },
      { trackId: 'b', position: 2048 },
      { trackId: 'c', position: 3072 },
    ];
    const prisma = buildPrismaMock(entries);
    const service = new PlaylistsService(prisma);

    // mover 'c' para o índice 1 (entre 'a' e 'b')
    await service.reorder('p1', 'u1', 'c', 1);

    expect(prisma.playlistTrack.update).toHaveBeenCalledWith({
      where: { playlistId_trackId: { playlistId: 'p1', trackId: 'c' } },
      data: { position: (1024 + 2048) / 2 },
    });
  });

  it('bloqueia reorder de quem não é dono da playlist', async () => {
    const prisma = buildPrismaMock([]);
    prisma.playlist.findUnique.mockResolvedValue({
      id: 'p1',
      ownerId: 'outro-usuario',
      isPublic: true,
    });
    const service = new PlaylistsService(prisma);

    await expect(service.reorder('p1', 'u1', 'c', 0)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
