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
  const hasJoined = job.participantIds.includes(activeUser.id);
  const hasCompleted = job.completedUserIds.includes(activeUser.id);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden group">
      {/* Subtle accent glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-3.5">
        {/* Top Tag */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide text-amber-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>JOB BARENG (FM)</span>
          </div>
          <span className="text-[11px] font-semibold bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-0.5 rounded-md">
            Unit: {job.targetUnit}
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
            <span className="font-semibold text-slate-400 block mb-1">Partisipan Bergabung:</span>
            <div className="flex flex-wrap gap-1.5">
              {(job.participantNames && job.participantNames.length > 0
                ? job.participantNames
                : job.participantIds
              ).map((nameOrId, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-slate-700/80 text-white font-medium text-[11px] border border-slate-600/50"
                >
                  {nameOrId}
                </span>
              ))}
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
              <span>Ikut Serta Job Bareng Ini</span>
            </button>
          ) : hasCompleted ? (
            <div className="w-full py-2.5 px-4 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Anda Telah Menyelesaikan Job Bareng Ini</span>
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
