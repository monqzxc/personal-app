import { fitnessRepository } from './container';

const unsupported = async (..._args: unknown[]) => { throw new Error('Live GPS tracking needs the Android or iPhone app. You can log activities manually here.'); };
export const fitnessTracking = {
  start: unsupported, resume: unsupported,
  pause: (id: string) => fitnessRepository.transition(id, 'pause'),
  finish: (id: string) => fitnessRepository.transition(id, 'finish'),
  async recover() {
    const active = await fitnessRepository.active();
    if (active?.status === 'recording') await fitnessRepository.transition(active.id, 'recover', Date.now(), 'Recording interrupted. Resume on your phone or finish the saved activity.');
  },
  get error() { return ''; },
};
