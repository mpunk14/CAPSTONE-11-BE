import { ids } from './ids';

export const usersSeed = (password: string) => [
  { id: ids.users.sppgKebayoran, email: 'sppg.kebayoran@simba.id', password, role: 'sppg' as const },
  { id: ids.users.sppgMenteng, email: 'sppg.menteng@simba.id', password, role: 'sppg' as const },
  { id: ids.users.sppgMatraman, email: 'sppg.matraman@simba.id', password, role: 'sppg' as const },
  { id: ids.users.sppgPriok, email: 'sppg.tanjungpriok@simba.id', password, role: 'sppg' as const },
  { id: ids.users.sppgCengkareng, email: 'sppg.cengkareng@simba.id', password, role: 'sppg' as const },
  { id: ids.users.schoolKebayoran01, email: 'sdn.kebayoran01@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolSmp12, email: 'smpn12.jakarta@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolPetogogan05, email: 'sdn.petogogan05@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolMenteng01, email: 'sdn.menteng01@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolSmp1, email: 'smpn1.jakarta@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolGondangdia03, email: 'sdn.gondangdia03@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolPisangan07, email: 'sdn.pisanganbaru07@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolSmp97, email: 'smpn97.jakarta@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolUtanKayu01, email: 'sdn.utankayu01@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolSunter09, email: 'sdn.sunteragung09@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolSmp95, email: 'smpn95.jakarta@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolKebonBawang03, email: 'sdn.kebonbawang03@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolCengkareng04, email: 'sdn.cengkarengbarat04@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolSmp45, email: 'smpn45.jakarta@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolRawaBuaya01, email: 'sdn.rawabuaya01@simba.id', password, role: 'school' as const },
];
