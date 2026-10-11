import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { isProfilePhoto, PROFILE_PHOTO_SIZE, squarePhotoCrop } from '../utils/profilePhoto';

export async function pickProfilePhoto(): Promise<string | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1, exif: false });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  if (!asset) throw new Error('No photo was selected. Please try again.');
  const context = ImageManipulator.manipulate(asset.uri);
  try {
    const source = await context.renderAsync();
    try { context.crop(squarePhotoCrop(source.width, source.height)).resize({ width: PROFILE_PHOTO_SIZE, height: PROFILE_PHOTO_SIZE }); }
    finally { source.release(); }
    const image = await context.renderAsync();
    try {
      const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
      const photo = `data:image/jpeg;base64,${result.base64 ?? ''}`;
      if (!isProfilePhoto(photo)) throw new Error('This photo could not be prepared. Please choose another image.');
      return photo;
    } finally { image.release(); }
  } finally { context.release(); }
}
