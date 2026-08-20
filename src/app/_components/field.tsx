import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const INPUT_CLASSES =
  "w-full rounded-[7px] border border-line px-3 py-2.5 text-sm text-ink focus:border-green-500 focus:outline-none";

type SharedProps = {
  label: string;
  id: string;
};

type FieldAsInput = SharedProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, keyof SharedProps> & {
    as?: "input";
  };

type FieldAsTextarea = SharedProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, keyof SharedProps> & {
    as: "textarea";
  };

export type FieldProps = FieldAsInput | FieldAsTextarea;

export function Field(props: FieldProps) {
  const { label, id, as = "input", ...rest } = props;

  return (
    <div className="mb-3.5">
      <label
        htmlFor={id}
        className="mb-1.5 block font-mono text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft"
      >
        {label}
      </label>
      {as === "textarea" ? (
        <textarea
          id={id}
          className={INPUT_CLASSES}
          {...(rest as Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">)}
        />
      ) : (
        <input
          id={id}
          className={INPUT_CLASSES}
          {...(rest as Omit<InputHTMLAttributes<HTMLInputElement>, "id">)}
        />
      )}
    </div>
  );
}
