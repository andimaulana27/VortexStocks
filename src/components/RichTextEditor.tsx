'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import { 
  Bold, Italic, Strikethrough, Pilcrow, List, ListOrdered, Quote, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Minus, 
  Link as LinkIcon, Image as ImageIcon, Youtube as YoutubeIcon, X 
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import toast, { Toaster } from 'react-hot-toast';

// --- KOMPONEN MODAL INLINE (Sudah diperbaiki dari error useEffect) ---
interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
  title: string;
  currentValue?: string;
}

const PromptModal = ({ isOpen, onClose, onSubmit, title, currentValue = '' }: PromptModalProps) => {
  // Karena kita akan me-render modal ini secara kondisional di parent, 
  // state ini akan selalu mengambil currentValue terbaru saat modal pertama kali dibuka.
  const [url, setUrl] = useState(currentValue);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-white"><X size={20} /></button>
        </div>
        <input 
          type="url" 
          value={url} 
          onChange={(e) => setUrl(e.target.value)} 
          placeholder="https://..."
          className="w-full bg-[#121212] border border-[#2d2d2d] rounded-lg p-3 text-white focus:border-[#06b6d4] outline-none mb-4"
          autoFocus
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-neutral-400 hover:text-white transition-colors">Batal</button>
          <button onClick={() => { onSubmit(url); onClose(); }} className="px-4 py-2 text-sm font-bold bg-[#06b6d4] text-white rounded-lg hover:bg-[#06b6d4]/80 transition-colors">
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
};

// --- KOMPONEN MENU BAR (TOOLBAR) ---
const MenuBar = ({ editor }: { editor: Editor | null }) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);
  const [currentYoutubeUrl, setCurrentYoutubeUrl] = useState('');
  
  const handleSetLink = useCallback((url: string) => {
    if (!editor) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const handleAddOrUpdateYoutube = useCallback((url: string) => {
    if (!editor) return;
    if (url) {
        if (editor.isActive('youtube')) {
            editor.chain().focus().updateAttributes('youtube', { src: url }).run();
        } else {
            editor.commands.setYoutubeVideo({ src: url });
        }
    }
  }, [editor]);

  const openYoutubeModal = useCallback(() => {
    if (!editor) return;
    const existingUrl = editor.getAttributes('youtube').src || '';
    setCurrentYoutubeUrl(existingUrl);
    setIsYoutubeModalOpen(true);
  }, [editor]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor) return;
    const file = event.target.files?.[0];
    if (!file) return;

    toast.loading('Mengunggah gambar...', { id: 'upload-image' });
    const fileName = `article_images/${Date.now()}-${file.name}`;
    
    try {
      const { data, error } = await supabase.storage.from('tutorial-covers').upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('tutorial-covers').getPublicUrl(data.path);
      editor.chain().focus().setImage({ src: publicUrl }).run();
      toast.success('Gambar berhasil ditambahkan!', { id: 'upload-image' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Upload gagal";
      toast.error(msg, { id: 'upload-image' });
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  if (!editor) return null;
  
  const buttonClass = (isActive: boolean) => 
    `p-1.5 rounded-md transition-colors ${
      isActive 
        ? 'bg-[#06b6d4]/20 text-[#06b6d4]'
        : 'bg-transparent text-neutral-400 hover:bg-[#2d2d2d] hover:text-white'
    }`;

  const Divider = () => <div className="w-px h-6 bg-[#2d2d2d] mx-1"></div>;

  return (
    <>
      {/* Solusi Render Kondisional: Modal hanya dirender jika statenya bernilai TRUE */}
      {isLinkModalOpen && (
        <PromptModal 
          isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} onSubmit={handleSetLink}
          title="Masukkan URL Link" currentValue={editor.getAttributes('link').href || ''}
        />
      )}
      
      {isYoutubeModalOpen && (
        <PromptModal 
          isOpen={isYoutubeModalOpen} onClose={() => setIsYoutubeModalOpen(false)} onSubmit={handleAddOrUpdateYoutube}
          title={currentYoutubeUrl ? "Update URL YouTube" : "Embed Video YouTube"} currentValue={currentYoutubeUrl}
        />
      )}
    
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[#2d2d2d] bg-[#1a1a1a] rounded-t-lg sticky top-0 z-10">
        <button type="button" onClick={() => editor.chain().focus().setParagraph().run()} className={buttonClass(editor.isActive('paragraph'))} title="Paragraf"><Pilcrow size={18} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={buttonClass(editor.isActive('heading', { level: 1 }))} title="Heading 1"><span className="font-bold text-sm">H1</span></button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={buttonClass(editor.isActive('heading', { level: 2 }))} title="Heading 2"><span className="font-bold text-sm">H2</span></button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={buttonClass(editor.isActive('heading', { level: 3 }))} title="Heading 3"><span className="font-bold text-sm">H3</span></button>
        
        <Divider />

        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={buttonClass(editor.isActive('bold'))} title="Bold"><Bold size={18} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={buttonClass(editor.isActive('italic'))} title="Italic"><Italic size={18} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={buttonClass(editor.isActive('strike'))} title="Strikethrough"><Strikethrough size={18} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={buttonClass(editor.isActive('blockquote'))} title="Blockquote"><Quote size={18} /></button>
        
        <Divider />

        <button type="button" onClick={() => setIsLinkModalOpen(true)} className={buttonClass(editor.isActive('link'))} title="Tambah Link"><LinkIcon size={18} /></button>
        <input type="file" ref={imageInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
        <button type="button" onClick={() => imageInputRef.current?.click()} className={buttonClass(editor.isActive('image'))} title="Sisipkan Gambar"><ImageIcon size={18} /></button>
        <button type="button" onClick={openYoutubeModal} className={buttonClass(editor.isActive('youtube'))} title="Embed YouTube"><YoutubeIcon size={18} /></button>

        <Divider />
        
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={buttonClass(editor.isActive('bulletList'))} title="Bullet List"><List size={18} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={buttonClass(editor.isActive('orderedList'))} title="Numbered List"><ListOrdered size={18} /></button>

        <Divider />
        
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={buttonClass(editor.isActive({ textAlign: 'left' }))} title="Align Left"><AlignLeft size={18} /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={buttonClass(editor.isActive({ textAlign: 'center' }))} title="Align Center"><AlignCenter size={18} /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={buttonClass(editor.isActive({ textAlign: 'right' }))} title="Align Right"><AlignRight size={18} /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={buttonClass(editor.isActive({ textAlign: 'justify' }))} title="Align Justify"><AlignJustify size={18} /></button>

        <Divider />

        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={buttonClass(false)} title="Garis Pemisah">
          <Minus size={18} />
        </button>
      </div>
    </>
  );
};

// --- KOMPONEN UTAMA ---
interface RichTextEditorProps {
  content: string; 
  onChange: (content: string) => void;
  placeholder?: string;
}

const RichTextEditor = ({ content, onChange, placeholder }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        horizontalRule: {
          HTMLAttributes: { class: 'my-6 border-[#2d2d2d]' },
        },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({
        inline: false,
        HTMLAttributes: { class: 'mx-auto rounded-lg max-h-[400px] object-contain my-4 border border-[#2d2d2d]' },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { class: 'text-[#06b6d4] hover:text-[#34d399] transition-colors underline' }
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
        HTMLAttributes: { class: 'mx-auto rounded-xl my-6 w-full aspect-video border border-[#2d2d2d]' }
      }),
    ],
    content: content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none text-white font-light leading-relaxed focus:outline-none p-5 w-full tiptap-content min-h-[250px]',
      },
    },
  });

  useEffect(() => {
    if (editor && content) {
      if (editor.getHTML() !== content) {
        editor.commands.setContent(content);
      }
    } else if (editor && content === '') {
        if (editor.getHTML() !== '<p></p>' && editor.getHTML() !== '') {
            editor.commands.setContent('');
        }
    }
  }, [content, editor]);

  return (
    <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl overflow-hidden shadow-sm focus-within:border-[#06b6d4] focus-within:ring-1 focus-within:ring-[#06b6d4] transition-all">
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#333', color: '#fff' } }}/>
      
      <style jsx global>{`
        .tiptap-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #666;
          pointer-events: none;
          height: 0;
        }
        .tiptap-content iframe {
          width: 100%;
          aspect-ratio: 16 / 9;
          height: auto;
          border-radius: 0.75rem;
        }
        .tiptap-content p {
            margin-top: 0.75em;
            margin-bottom: 0.75em;
        }
        .tiptap-content h1 { color: #fff; font-size: 1.8rem; font-weight: bold; margin-bottom: 1rem; }
        .tiptap-content h2 { color: #06b6d4; font-size: 1.5rem; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.75rem; }
        .tiptap-content h3 { color: #34d399; font-size: 1.25rem; font-weight: bold; margin-top: 1.25em; margin-bottom: 0.5rem; }
        .tiptap-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
        .tiptap-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
        .tiptap-content blockquote { border-left: 4px solid #06b6d4; padding-left: 1rem; font-style: italic; color: #a3a3a3; margin: 1.5rem 0; background: #121212; padding: 1rem; border-radius: 0 0.5rem 0.5rem 0; }
       `}</style>
       
      <MenuBar editor={editor} />
      <EditorContent editor={editor} data-placeholder={placeholder || 'Mulai menulis artikel edukasi...'} />
    </div>
  );
};

export default RichTextEditor;