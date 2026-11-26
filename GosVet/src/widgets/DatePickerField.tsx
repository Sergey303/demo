import { Calendar } from "primereact/calendar";
import { primeRuLocale } from "../app/primeLocale";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  placeholder?: string;
};

const toDate = (value: string) => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) || date.getFullYear()!==Number(match[1]) || date.getMonth()!==Number(match[2])-1 || date.getDate()!==Number(match[3]) ? null : date;
};

const toDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function DatePickerField({
  value,
  onChange,
  className,
  inputClassName,
  disabled,
  placeholder = "дд.мм.гггг"
}: Props) {
  return (
    <Calendar
      value={toDate(value)}
      onChange={(event) => onChange(event.value instanceof Date ? toDateInputValue(event.value) : "")}
      locale={primeRuLocale}
      dateFormat="dd.mm.yy"
      mask="99.99.9999"
      placeholder={placeholder}
      showIcon
      disabled={disabled}
      className={["gosvet-date-picker",className].filter(Boolean).join(" ")}
      inputClassName={inputClassName}
    />
  );
}
