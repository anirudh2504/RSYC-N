import { useRef } from 'react';

/**
 * A button that opens the file chooser.
 *
 * The obvious way to do this is a <label htmlFor> pointing at a hidden input,
 * but that quietly fails in enough situations — hidden inputs, nested inline
 * SVG, inputs moved around by re-renders — that it is not worth relying on.
 * A real button holding a ref and calling input.click() itself behaves the same
 * way in every browser, so every upload in the app goes through this.
 */
export default function FilePicker({
  onPick,
  multiple = false,
  accept = 'image/*',
  className = 'btn btn-ghost btn-sm',
  disabled = false,
  children,
  ...rest
}) {
  const inputRef = useRef(null);

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled}
        onClick={() => inputRef.current && inputRef.current.click()}
        {...rest}
      >
        {children}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          // Reset first, so choosing the same file twice still fires onChange.
          event.target.value = '';
          if (files.length) onPick(multiple ? files : files[0]);
        }}
      />
    </>
  );
}
