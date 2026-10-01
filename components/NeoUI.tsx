
import React from 'react';

// --- BUTTON ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
}

export const NeoButton: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "border-3 border-black font-black text-sm md:text-base py-3 px-6 uppercase tracking-wider transition-transform hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-none whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none";
  let colorStyle = "";
  
  switch(variant) {
    case 'primary': colorStyle = "bg-neo-blue text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"; break;
    case 'secondary': colorStyle = "bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"; break;
    case 'danger': colorStyle = "bg-neo-orange text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"; break;
    case 'success': colorStyle = "bg-neo-green text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"; break;
  }

  return (
    <button className={`${baseStyle} ${colorStyle} ${className}`} {...props}>
      {children}
    </button>
  );
};

// --- LOADING ICON ---
export const IconLoading: React.FC = () => (
  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// --- SYNC ICON ---
export const IconSync: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
  </svg>
);

// --- CARD ---
export const NeoCard: React.FC<{ children: React.ReactNode; className?: string, title?: string }> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${className}`}>
      {title && (
        <div className="bg-neo-yellow border-b-4 border-black p-4 flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-black">
            {title}
          </h2>
          <div className="flex gap-2">
             <div className="w-3 h-3 rounded-full bg-black border border-white"></div>
             <div className="w-3 h-3 rounded-full bg-black border border-white"></div>
             <div className="w-3 h-3 rounded-full bg-black border border-white"></div>
          </div>
        </div>
      )}
      <div className="p-4 md:p-6">
        {children}
      </div>
    </div>
  );
};

// --- INPUT ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  rightIcon?: React.ReactNode;
}
export const NeoInput: React.FC<InputProps> = ({ label, className = '', rightIcon, ...props }) => {
  return (
    <div className="mb-6 w-full group">
      {label && <label className="block font-black mb-2 uppercase text-xs md:text-sm tracking-widest bg-black text-white inline-block px-2 py-1 transform -rotate-1 border-2 border-transparent group-hover:border-neo-yellow group-hover:text-neo-yellow transition-colors">{label}</label>}
      <div className="relative">
        <input 
          className={`w-full bg-gray-50 border-3 border-black p-3 md:p-4 font-bold text-lg focus:outline-none focus:bg-neo-bg focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all placeholder:text-gray-400 placeholder:uppercase placeholder:text-sm ${className}`} 
          {...props} 
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
    </div>
  );
};

// --- SELECT ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}
export const NeoSelect: React.FC<SelectProps> = ({ label, children, className = '', ...props }) => {
  return (
    <div className="mb-6 w-full">
      {label && <label className="block font-black mb-2 uppercase text-xs md:text-sm tracking-widest bg-black text-white inline-block px-2 py-1 transform rotate-1">{label}</label>}
      <div className="relative">
        <select 
          className={`w-full appearance-none bg-white border-3 border-black p-3 md:p-4 font-bold text-lg focus:outline-none focus:bg-neo-bg focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${className}`} 
          {...props} 
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 border-l-3 border-black bg-neo-yellow text-black h-full">
          <svg className="fill-current h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
        </div>
      </div>
    </div>
  );
};

// --- MODAL ---
export const NeoModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-neo-purple/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-[95%] md:max-w-lg max-h-[90vh] overflow-y-auto relative animate-[bounce_0.2s_ease-out]">
        <div className="flex justify-between items-center border-b-4 border-black p-4 bg-neo-green sticky top-0 z-10">
          <h3 className="text-xl md:text-2xl font-black uppercase truncate mr-2 tracking-tighter">{title}</h3>
          <button onClick={onClose} className="bg-red-500 text-white border-2 border-black w-8 h-8 flex items-center justify-center font-black text-lg hover:bg-red-600 hover:shadow-neo-sm transition-all">&times;</button>
        </div>
        <div className="p-6 md:p-8 bg-white">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- CONFIRM MODAL ---
export const NeoConfirmModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string }> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
        <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm relative transform rotate-1">
          <div className="bg-neo-orange border-b-4 border-black p-3">
             <h3 className="text-xl font-black uppercase text-white tracking-widest">{title}</h3>
          </div>
          <div className="p-6">
            <p className="font-bold text-lg mb-8 uppercase leading-tight">{message}</p>
            <div className="flex gap-4">
              <NeoButton onClick={onClose} variant="secondary" className="flex-1">Batal</NeoButton>
              <NeoButton onClick={() => { onConfirm(); onClose(); }} variant="danger" className="flex-1">Ya, Hapus</NeoButton>
            </div>
          </div>
        </div>
      </div>
    );
};

// --- TOAST ---
export const NeoToast: React.FC<{ show: boolean; message: string; onClose: () => void }> = ({ show, message, onClose }) => {
  if (!show) return null;
  return (
    <div className="fixed top-24 right-0 left-0 flex justify-center z-50 pointer-events-none">
      <div className="animate-[bounce_0.5s_infinite] pointer-events-auto bg-neo-yellow border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 md:p-6 flex items-center gap-4 max-w-sm mx-4 transform rotate-1">
         <div className="font-black text-sm md:text-lg flex-grow uppercase tracking-widest">{message}</div>
         <button onClick={onClose} className="font-black text-xl bg-black text-white w-10 h-10 flex items-center justify-center border-2 border-white hover:bg-gray-800 flex-shrink-0">&times;</button>
      </div>
    </div>
  );
};

// --- TABLE ---
export const NeoTable: React.FC<{ headers: string[]; children: React.ReactNode }> = ({ headers, children }) => {
  return (
    <div className="overflow-x-auto border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-neo-yellow text-black border-b-4 border-black">
            {headers.map((h, i) => (
              <th key={i} className="p-4 font-black uppercase border-r-4 border-black last:border-r-0 whitespace-nowrap text-sm tracking-widest">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="font-bold text-black">
          {children}
        </tbody>
      </table>
    </div>
  );
};

// --- BOTTOM NAVIGATION (MOBILE) ---
interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
}

export const NeoBottomNav: React.FC<{ items: NavItem[]; activeId: string; onChange: (id: any) => void }> = ({ items, activeId, onChange }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black z-40 md:hidden pb-safe shadow-[0_-4px_0_0_rgba(0,0,0,0.1)]">
            <div className="flex justify-around items-stretch h-20">
                {items.map((item) => {
                    const isActive = activeId === item.id;
                    return (
                        <button 
                            key={item.id}
                            onClick={() => onChange(item.id)}
                            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all border-r-2 border-black last:border-r-0 ${isActive ? 'bg-neo-yellow translate-y-[-4px] border-t-4 border-black' : 'bg-white hover:bg-gray-100'}`}
                        >
                            <div className={`transform transition-transform ${isActive ? 'scale-110 rotate-3' : ''}`}>
                                {item.icon}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${isActive ? 'underline decoration-2' : ''}`}>
                                {item.label}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    );
};
