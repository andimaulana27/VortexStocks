'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { MonitorPlay, Plus, Trash2, Edit, UploadCloud, FileText, Film, Loader2, X } from 'lucide-react';
import Image from 'next/image';
import RichTextEditor from '@/components/RichTextEditor';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video';
  cover_url: string;
  content: string;
}

export default function AdminTutorialsPage() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createClient();

  // State Form & Edit Mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'article' | 'video'>('article');
  const [textContent, setTextContent] = useState(''); 
  
  // State Files
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState('');
  const [existingContentUrl, setExistingContentUrl] = useState('');

  const fetchTutorials = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('tutorials').select('*').order('created_at', { ascending: false });
    if (!error && data) setTutorials(data as Tutorial[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTutorials();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileUpload = async (file: File, bucket: string, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const deleteFileFromStorage = async (url: string, bucket: string) => {
    try {
      const fileName = url.split('/').pop();
      if (fileName) await supabase.storage.from(bucket).remove([fileName]);
    } catch (e) {
      console.error("Gagal menghapus file lama:", e);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle(''); setDescription(''); setType('article');
    setCoverFile(null); setVideoFile(null); setTextContent('');
    setExistingCoverUrl(''); setExistingContentUrl('');
  };

  // Fungsi untuk masuk ke mode EDIT
  const handleEditClick = (tutorial: Tutorial) => {
    setEditingId(tutorial.id);
    setTitle(tutorial.title);
    setDescription(tutorial.description);
    setType(tutorial.type);
    setExistingCoverUrl(tutorial.cover_url);
    
    if (tutorial.type === 'article') {
      setTextContent(tutorial.content);
      setExistingContentUrl('');
    } else {
      setTextContent('');
      setExistingContentUrl(tutorial.content);
    }
    
    setCoverFile(null);
    setVideoFile(null);

    // Scroll otomatis ke form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isTextEmpty = textContent === '' || textContent === '<p></p>';
    
    // Validasi Dinamis (Jika mode edit, file baru opsional)
    if (!title || !description || 
        (!coverFile && !existingCoverUrl) || 
        (type === 'article' && isTextEmpty) || 
        (type === 'video' && !videoFile && !existingContentUrl)) {
      alert('Mohon lengkapi semua data form!');
      return;
    }

    setIsUploading(true);

    try {
      // 1. Tangani Upload Cover Baru (dan hapus yang lama jika ada)
      let finalCoverUrl = existingCoverUrl;
      if (coverFile) {
        finalCoverUrl = await handleFileUpload(coverFile, 'tutorial-covers', 'cover');
        if (editingId && existingCoverUrl) await deleteFileFromStorage(existingCoverUrl, 'tutorial-covers');
      }

      // 2. Tangani Upload Video Baru / Teks Artikel
      let finalContent = type === 'article' ? textContent : existingContentUrl;
      if (type === 'video' && videoFile) {
        finalContent = await handleFileUpload(videoFile, 'tutorial-videos', 'video');
        if (editingId && existingContentUrl && existingContentUrl.includes('tutorial-videos')) {
          await deleteFileFromStorage(existingContentUrl, 'tutorial-videos');
        }
      }

      // 3. Simpan ke Database (Update atau Insert)
      const payload = {
        title, description, type, cover_url: finalCoverUrl, content: finalContent, updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase.from('tutorials').update(payload).eq('id', editingId);
        if (error) throw error;
        alert('Perubahan tutorial berhasil disimpan!');
      } else {
        const { error } = await supabase.from('tutorials').insert([payload]);
        if (error) throw error;
        alert('Tutorial baru berhasil diunggah!');
      }
      
      resetForm();
      fetchTutorials();

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert('Gagal memproses data: ' + errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (tutorial: Tutorial) => {
    if (!confirm('Yakin ingin menghapus tutorial ini? File di storage juga akan dihapus permanen.')) return;

    try {
      const { error: dbError } = await supabase.from('tutorials').delete().eq('id', tutorial.id);
      if (dbError) throw dbError;

      // Bersihkan Storage
      await deleteFileFromStorage(tutorial.cover_url, 'tutorial-covers');
      if (tutorial.type === 'video') {
        await deleteFileFromStorage(tutorial.content, 'tutorial-videos');
      }

      if (editingId === tutorial.id) resetForm(); // Batal edit jika yang sedang diedit malah dihapus
      fetchTutorials();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert('Gagal menghapus: ' + errorMessage);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MonitorPlay className="text-[#06b6d4]" size={28} /> Manajemen Tutorial
        </h1>
        <p className="text-neutral-400 text-sm mt-1">Buat, edit, unggah, dan kelola konten edukasi untuk pengguna.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ================= FORM CMS ================= */}
        <div className={`lg:col-span-6 xl:col-span-5 bg-[#121212] border ${editingId ? 'border-[#06b6d4] shadow-[0_0_20px_rgba(6,182,212,0.15)]' : 'border-[#2d2d2d] shadow-xl'} rounded-2xl p-6 h-fit transition-all duration-300`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-bold flex items-center gap-2 ${editingId ? 'text-[#06b6d4]' : 'text-white'}`}>
              {editingId ? <><Edit size={18}/> Mode Edit Konten</> : <><Plus size={18}/> Tambah Konten Baru</>}
            </h2>
            {editingId && (
              <button onClick={resetForm} className="text-xs font-bold bg-[#1e1e1e] hover:bg-[#2d2d2d] text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 border border-[#2d2d2d]">
                <X size={14}/> Batal
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button type="button" onClick={() => setType('article')} className={`py-2 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all ${type === 'article' ? 'bg-[#06b6d4]/10 border-[#06b6d4] text-[#06b6d4]' : 'bg-[#1e1e1e] border-[#2d2d2d] text-neutral-500 hover:text-white'}`}>
                <FileText size={16} /> Artikel
              </button>
              <button type="button" onClick={() => setType('video')} className={`py-2 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all ${type === 'video' ? 'bg-[#ef4444]/10 border-[#ef4444] text-[#ef4444]' : 'bg-[#1e1e1e] border-[#2d2d2d] text-neutral-500 hover:text-white'}`}>
                <Film size={16} /> Video
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-400">Judul</label>
              <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg p-2.5 text-sm text-white focus:border-[#06b6d4] outline-none mt-1" placeholder="Judul tutorial..." />
            </div>
            
            <div>
              <label className="text-xs font-bold text-neutral-400">Deskripsi Singkat</label>
              <input required type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg p-2.5 text-sm text-white focus:border-[#06b6d4] outline-none mt-1" placeholder="Ringkasan materi..." />
            </div>

            {/* Input Cover (Error block flex diperbaiki menjadi flex items-center) */}
            <div>
              <label className="text-xs font-bold text-neutral-400 mb-1 flex items-center justify-between">
                <span>Cover / Thumbnail Image</span>
                {existingCoverUrl && <span className="text-[#06b6d4]">(Tersimpan)</span>}
              </label>
              <label className={`flex items-center gap-3 w-full bg-[#1e1e1e] border border-dashed rounded-lg p-3 cursor-pointer transition-colors ${coverFile ? 'border-[#34d399]' : existingCoverUrl ? 'border-[#06b6d4]' : 'border-[#2d2d2d] hover:border-[#06b6d4]'}`}>
                <UploadCloud className={coverFile || existingCoverUrl ? 'text-[#06b6d4]' : 'text-neutral-500'} size={20} shrink-0 />
                <span className={`text-sm truncate ${coverFile || existingCoverUrl ? 'text-white' : 'text-neutral-400'}`}>
                  {coverFile ? coverFile.name : existingCoverUrl ? 'Klik untuk mengganti cover saat ini' : 'Pilih file gambar (JPG/PNG)'}
                </span>
                <input required={!coverFile && !existingCoverUrl} type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
            </div>

            {/* Input Tipe Konten (Error block flex diperbaiki menjadi flex items-center) */}
            <div>
              <label className="text-xs font-bold text-neutral-400 mb-1 flex items-center justify-between">
                <span>{type === 'video' ? 'Upload File Video (MP4)' : 'Isi Artikel Lengkap'}</span>
                {type === 'video' && existingContentUrl && <span className="text-[#ef4444]">(Tersimpan)</span>}
              </label>
              
              {type === 'video' ? (
                <label className={`flex items-center gap-3 w-full bg-[#1e1e1e] border border-dashed rounded-lg p-3 cursor-pointer transition-colors ${videoFile ? 'border-[#34d399]' : existingContentUrl ? 'border-[#ef4444]' : 'border-[#2d2d2d] hover:border-[#ef4444]'}`}>
                  <Film className={videoFile || existingContentUrl ? 'text-[#ef4444]' : 'text-neutral-500'} size={20} shrink-0 />
                  <span className={`text-sm truncate ${videoFile || existingContentUrl ? 'text-white' : 'text-neutral-400'}`}>
                    {videoFile ? videoFile.name : existingContentUrl ? 'Klik untuk mengganti video saat ini' : 'Pilih file video (MP4/WebM)'}
                  </span>
                  <input required={type === 'video' && !videoFile && !existingContentUrl} type="file" accept="video/mp4,video/webm" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} className="hidden" />
                </label>
              ) : (
                <div className="mt-1">
                  <RichTextEditor content={textContent} onChange={setTextContent} />
                </div>
              )}
            </div>

            <button disabled={isUploading} type="submit" className={`w-full mt-4 py-3 rounded-lg font-bold text-sm shadow-[0_4px_15px_rgba(52,211,153,0.3)] hover:scale-[1.02] transition-transform flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white ${editingId ? 'bg-gradient-to-r from-[#3b82f6] to-[#06b6d4]' : 'bg-gradient-to-r from-[#06b6d4] to-[#34d399]'}`}>
              {isUploading ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : editingId ? 'Simpan Perubahan' : 'Simpan & Publikasikan'}
            </button>
          </form>
        </div>

        {/* ================= LIST TUTORIAL ================= */}
        <div className="lg:col-span-6 xl:col-span-7 bg-[#121212] border border-[#2d2d2d] rounded-2xl shadow-xl p-6 h-fit">
          <h2 className="text-lg font-bold text-white mb-4">Daftar Konten Aktif</h2>
          {isLoading ? (
            <div className="text-neutral-500 animate-pulse flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Memuat data...</div>
          ) : tutorials.length === 0 ? (
            <div className="text-neutral-500 text-sm p-10 text-center border border-[#2d2d2d] border-dashed rounded-xl">Belum ada tutorial yang diunggah.</div>
          ) : (
            <div className="space-y-3">
              {tutorials.map((tut) => (
                <div key={tut.id} className={`bg-[#1e1e1e] border rounded-xl p-4 flex items-center justify-between transition-colors group ${editingId === tut.id ? 'border-[#06b6d4] bg-[#06b6d4]/5' : 'border-[#2d2d2d] hover:border-neutral-500'}`}>
                  
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-24 h-16 relative rounded-md overflow-hidden bg-neutral-800 shrink-0 border border-[#2d2d2d]">
                      <Image src={tut.cover_url} alt="cover" fill className="object-cover" unoptimized />
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider ${tut.type === 'video' ? 'bg-[#ef4444] text-white' : 'bg-[#06b6d4] text-white'}`}>{tut.type}</span>
                        <h3 className="text-sm font-bold text-white truncate">{tut.title}</h3>
                      </div>
                      <p className="text-xs text-neutral-400 truncate w-[90%]">{tut.description}</p>
                    </div>
                  </div>
                  
                  {/* Tombol Aksi */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button onClick={() => handleEditClick(tut)} className="p-2 text-neutral-400 hover:text-[#06b6d4] hover:bg-[#06b6d4]/10 rounded-lg transition-colors" title="Edit Konten">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(tut)} className="p-2 text-neutral-400 hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors" title="Hapus Permanen">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}