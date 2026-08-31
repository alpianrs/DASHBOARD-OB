import React from 'react';
import { Sparkles, Users, CheckCircle, Clock, MapPin, ArrowRight } from 'lucide-react';
import { JobBareng, User } from '../types';

interface JobBarengCardProps {
  job: JobBareng;
  activeUser: User;
  onJoinJob: (jobId: string) => void;
  onCompleteJob: (job: JobBareng) => void;
}

export const JobBarengCard: React.FC<JobBarengCardProps> = ({
  job,
  activeUser,
  onJoinJob,
  onCompleteJob,
}) => {
  const hasJoined =
    job.participantIds?.includes(activeUser.id) ||
    job.participantIds?.includes(activeUser.username) ||
    Boolean(activeUser.name && job.participantNames?.some((n) => n.toLowerCase().trim() === activeUser.name.toLowerCase().trim())) ||
    Boolean(activeUser.name && job.participantIds?.some((id) => id.toLowerCase().trim() === activeUser.name.toLowerCase().trim()));

  const hasCompleted =
    job.completedUserIds?.includes(activeUser.id) ||
    job.completedUserIds?.includes(activeUser.username) ||
    Boolean(activeUser.name && job.completedUserNames?.some((n) => n.toLowerCase().trim() === activeUser.name.toLowerCase().trim())) ||
    Boolean(activeUser.name && job.completedUserIds?.some((id) => id.toLowerCase().trim() === activeUser.name.toLowerCase().trim()));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden group">
      {/* Subtle accent glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-3.5">
        {/* Top Tag */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide text-amber-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>TUGAS INSIDENTAL</span>
          </div>
          <span className="text-[11px] font-semibold bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-0.5 rounded-md">
            {job.assignmentType === 'specific'
              ? `Khusus (${job.assignedUserIds?.length || 0} Petugas)`
              : `Unit: ${job.targetUnit}`}
          </span>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-base font-bold text-white leading-snug tracking-tight">{job.title}</h3>
          <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">{job.description}</p>
        </div>

        {/* Info Rows */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1">
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>{job.timeTarget || 'Hari Ini'}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span>{job.targetArea}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              <strong className="text-white">
                {Math.max(job.participantIds.length, job.participantNames?.length || 0)}
              </strong>{' '}
              Rekan Ikut
            </span>
          </div>
        </div>

        {/* List of participant names */}
        {((job.participantNames && job.participantNames.length > 0) || (job.participantIds && job.participantIds.length > 0)) && (
          <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-2.5 text-[11px] text-slate-300">
            <span className="font-semibold text-slate-400 block mb-1">
              Partisipan Bergabung ({Math.max(job.participantIds.length, job.participantNames?.length || 0)} Petugas):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(job.participantNames && job.participantNames.length > 0
                ? job.participantNames
                : job.participantIds
              ).map((nameOrId, idx) => {
                const isUserDone =
                  job.completedUserNames?.some((n) => n.toLowerCase().trim() === nameOrId.toLowerCase().trim()) ||
                  job.completedUserIds?.some((id) => id.toLowerCase().trim() === nameOrId.toLowerCase().trim());
                return (
                  <span
                    key={idx}
                    className={`px-2 py-0.5 rounded-md font-medium text-[11px] border flex items-center gap-1 ${
                      isUserDone
                        ? 'bg-emerald-900/70 text-emerald-200 border-emerald-600/60'
                        : 'bg-slate-700/80 text-slate-200 border-slate-600/50'
                    }`}
                  >
                    {isUserDone ? (
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Clock className="w-3 h-3 text-sky-400" />
                    )}
                    <span>{nameOrId}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 flex items-center gap-2">
          {!hasJoined ? (
            <button
              onClick={() => onJoinJob(job.id)}
              className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Users className="w-4 h-4" />
              <span>Ikut Serta Tugas Insidental Ini</span>
            </button>
          ) : hasCompleted ? (
            <div className="w-full flex items-center justify-between gap-2 p-2.5 bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 rounded-xl text-xs">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Anda Telah Berpartisipasi & Selesai Hari Ini</span>
              </div>
              <button
                onClick={() => onCompleteJob(job)}
                className="py-1 px-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-[11px] transition cursor-pointer shrink-0"
              >
                Foto Tambahan
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 text-xs bg-slate-800 border border-slate-700 px-3 py-2.5 rounded-xl text-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Status: Anda Sedang Berpartisipasi</span>
              </div>
              <button
                onClick={() => onCompleteJob(job)}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-98"
              >
                <span>Selesaikan & Foto</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
