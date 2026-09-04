import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="flex flex-1 justify-center px-4 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <Link
          href="/"
          className="text-sm font-medium text-green-700 underline"
        >
          ← Wstecz
        </Link>

        <h1 className="font-display text-3xl font-semibold text-ink">
          Informacja o prywatności
        </h1>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-ink">
            Administrator danych
          </h2>
          <p className="text-sm text-ink-soft">
            Administratorem Twoich danych osobowych jest:
            </p>
            <p className="text-sm text-ink-soft">
            <strong className="text-ink">
              Tomasz Kasprzycki
            </strong>
            , e-mail:{" "}
            <strong className="text-ink">
              tomasz.kasprzycki@gmail.com
            </strong>
            .
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-ink">
            Co zbieramy i dlaczego
          </h2>
          <p className="text-sm text-ink-soft">
            Domowa Biblioteka zbiera wyłącznie dane niezbędne do działania
            aplikacji — nic nie jest zbierane na potrzeby reklam, analityki
            ani odsprzedaży.
          </p>
          <ul className="list-disc pl-5 text-sm text-ink-soft">
            <li>
              <strong className="text-ink">Dane konta</strong> — Twój e-mail,
              hasło (przechowywane jako solony hash, nigdy jawnym tekstem)
              oraz imię i nazwisko. Służą do utworzenia i zabezpieczenia
              konta oraz identyfikacji Cię wobec znajomych, z którymi się
              łączysz.
            </li>
            <li>
              <strong className="text-ink">Graf społecznościowy</strong> —
              informacja o tym, komu wysłałeś lub od kogo przyjąłeś
              zaproszenie do grona znajomych. Służy do określenia, czyją
              kolekcję książek możesz zobaczyć i z której możesz wypożyczać —
              kolekcja nigdy nie jest widoczna poza kręgiem potwierdzonych
              znajomych.
            </li>
            <li>
              <strong className="text-ink">Twoja kolekcja</strong> — książki,
              które dodajesz (tytuł, autor, opcjonalne notatki i ISBN). Służą
              do wyświetlania Twojej półki potwierdzonym znajomym oraz w
              Twoim własnym widoku kolekcji.
            </li>
            <li>
              <strong className="text-ink">Historia wypożyczeń</strong> —
              kto, od kogo i kiedy wypożyczył daną książkę. Służy do
              śledzenia dostępności książek oraz obsługi procesu
              wypożyczania i zwrotu.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-ink">Podstawa prawna</h2>
          <p className="text-sm text-ink-soft">
            Przetwarzamy te dane na podstawie art. 6 ust. 1 lit. b RODO —
            niezbędności do wykonania umowy, którą zawierasz z nami w
            momencie założenia konta (regulamin / warunki korzystania z
            aplikacji). Każda z powyższych kategorii danych istnieje po to,
            by dostarczyć funkcję, o którą prosisz, korzystając z niej
            (dodanie książki, wysłanie zaproszenia do znajomych, prośba o
            wypożyczenie).
          </p>
          <p className="text-sm text-ink-soft">
            Podanie danych konta (e-mail, hasło, imię i nazwisko) jest{" "}
            <strong className="text-ink">warunkiem</strong> założenia konta —
            bez nich utworzenie konta i korzystanie z aplikacji nie jest
            możliwe. Podanie pozostałych danych (np. notatek do książki) jest
            dobrowolne i zależy od tego, z jakich funkcji chcesz korzystać.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-ink">
            Kto przetwarza te dane
          </h2>
          <p className="text-sm text-ink-soft">
            W naszym imieniu dane przetwarza dwóch dostawców infrastruktury,
            na podstawie umów powierzenia przetwarzania danych:
          </p>
          <ul className="list-disc pl-5 text-sm text-ink-soft">
            <li>
              <strong className="text-ink">Vercel</strong> — hostuje
              aplikację i uruchamia jej funkcje serwerowe.
            </li>
            <li>
              <strong className="text-ink">Neon</strong> — hostuje bazę
              danych.
            </li>
          </ul>

          <h3 className="mt-2 text-sm font-semibold text-ink">
            Przekazywanie danych poza Europejski Obszar Gospodarczy
          </h3>
          <p className="text-sm text-ink-soft">
            Baza danych Neon działa obecnie w regionie Stanów Zjednoczonych,
            a nie w regionie Unii Europejskiej, w którym działają nasze
            serwery aplikacji. Oznacza to przekazywanie danych osobowych poza
            EOG.
          </p>
          <p className="text-sm text-ink-soft">
            Podstawą prawną tego transferu są:{" "}
            <strong className="text-ink">
              [wskaż konkretny mechanizm — np. Standardowe Klauzule Umowne
              (SCC) zawarte z Neon / certyfikacja dostawcy w ramach EU-US
              Data Privacy Framework]
            </strong>
            . Kopię odpowiednich zabezpieczeń możesz uzyskać, kontaktując się
            z nami pod adresem podanym w sekcji „Administrator danych”.
          </p>
          <p className="text-sm text-ink-soft">
            To znana luka, którą zamierzamy usunąć poprzez migrację do
            regionu bazy danych w UE.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-ink">Twoje prawa</h2>
          <p className="text-sm text-ink-soft">
            W związku z przetwarzaniem Twoich danych osobowych przysługują Ci
            następujące prawa:
          </p>
          <ul className="list-disc pl-5 text-sm text-ink-soft">
            <li>
              <strong className="text-ink">Prawo dostępu</strong> do swoich
              danych i uzyskania ich kopii.
            </li>
            <li>
              <strong className="text-ink">Prawo do sprostowania</strong>{" "}
              danych, jeśli są nieprawidłowe lub niekompletne.
            </li>
            <li>
              <strong className="text-ink">Prawo do usunięcia</strong> danych
              („prawo do bycia zapomnianym”).
            </li>
            <li>
              <strong className="text-ink">
                Prawo do ograniczenia przetwarzania
              </strong>{" "}
              w określonych sytuacjach.
            </li>
            <li>
              <strong className="text-ink">
                Prawo do przenoszenia danych
              </strong>{" "}
              — otrzymania ich w ustrukturyzowanym, powszechnie używanym
              formacie.
            </li>
            <li>
              <strong className="text-ink">
                Prawo do wniesienia sprzeciwu
              </strong>{" "}
              wobec przetwarzania, jeśli dotyczy przetwarzania na podstawie
              prawnie uzasadnionego interesu.
            </li>
            <li>
              <strong className="text-ink">
                Prawo do wniesienia skargi
              </strong>{" "}
              do organu nadzorczego — w Polsce jest to Prezes Urzędu Ochrony
              Danych Osobowych (UODO), ul. Stawki 2, 00-193 Warszawa,{" "}
              <a
                href="https://uodo.gov.pl"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-green-700 underline"
              >
                uodo.gov.pl
              </a>
              .
            </li>
          </ul>
          <p className="text-sm text-ink-soft">
            Z większości powyższych praw możesz skorzystać samodzielnie lub
            kontaktując się z nami pod adresem podanym w sekcji
            „Administrator danych”.
          </p>

          <h3 className="mt-2 text-sm font-semibold text-ink">
            Usunięcie konta
          </h3>
          <p className="text-sm text-ink-soft">
            Możesz w każdej chwili trwale usunąć swoje konto oraz wszystko,
            co jest z nim związane — Twoją kolekcję, połączenia ze znajomymi
            i historię wypożyczeń — na{" "}
            <Link
              href="/account"
              className="font-medium text-green-700 underline"
            >
              stronie swojego konta
            </Link>
            . Usunięcie następuje natychmiast i nie można go cofnąć.
          </p>
        </section>

        <p className="mt-2 text-xs italic text-ink-faint">
          Ostatnia aktualizacja: 4 września 2026
        </p>
      </div>
    </main>
  );
}
