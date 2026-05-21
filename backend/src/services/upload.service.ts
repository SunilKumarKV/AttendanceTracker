import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/AppError.js';

export interface UploadResult {
  url: string;
  provider: 'local';
}

export interface UploadProvider {
  uploadAvatar(userId: string, dataUrl: string): Promise<UploadResult>;
}

const maxAvatarBytes = 2 * 1024 * 1024;

class LocalAvatarProvider implements UploadProvider {
  async uploadAvatar(userId: string, dataUrl: string): Promise<UploadResult> {
    if (!dataUrl.startsWith('data:image/')) {
      throw new AppError('Avatar must be an image data URL', StatusCodes.BAD_REQUEST);
    }

    const base64 = dataUrl.split(',')[1] ?? '';
    const size = Buffer.byteLength(base64, 'base64');
    if (size > maxAvatarBytes) {
      throw new AppError('Avatar must be smaller than 2MB', StatusCodes.BAD_REQUEST);
    }

    return {
      url: dataUrl,
      provider: 'local',
    };
  }
}

export const uploadProvider: UploadProvider = new LocalAvatarProvider();
