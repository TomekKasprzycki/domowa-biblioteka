---
date: 2026-08-22T18:56:16+02:00
researcher: Tomasz Kasprzycki
git_commit: 68766058a06fc690a63c440687b7f55abec51a0d
branch: master
repository: TomekKasprzycki/domowa-biblioteka
topic: "Czy projekt Domowa Biblioteka wymaga informacji o GDPR?"
tags: [research, gdpr, rodo, privacy, compliance, infrastructure]
status: complete
last_updated: 2026-08-22
last_updated_by: Tomasz Kasprzycki
---

# Research: Czy projekt wymaga informacji o GDPR?

**Date**: 2026-08-22T18:56:16+02:00
**Researcher**: Tomasz Kasprzycki
**Git Commit**: 68766058a06fc690a63c440687b7f55abec51a0d
**Branch**: master
**Repository**: TomekKasprzycki/domowa-biblioteka

## Research Question

Bazując na `context/foundation/roadmap.md` — czy ten projekt wymaga uwzględnienia informacji o GDPR (RODO)? Zakres uzgodniony z użytkownikiem: ocena stosowalności + konkretne luki w `prd.md`/`roadmap.md` jako kandydaci do sekcji Open Questions.

## Summary

**Tak — GDPR/RODO dotyczy tego projektu, i obecnie nie jest nigdzie w projekcie zaadresowane.**

Domowa Biblioteka przetwarza dane osobowe realnych, możliwych do zidentyfikowania osób (email, hasło, imię, graf znajomości, historia wypożyczeń) w wielo-użytkownikowej aplikacji webowej, dla persony jednoznacznie polskiej/UE (`prd.md:27-31`, spolszczony mockup w `context/design/design.html`). Wyjątek "czysto prywatny użytek domowy" (art. 2(2)(c) RODO) nie chroni tu operatora — jedna osoba (deweloper) uruchamia usługę dla wielu odrębnych gospodarstw domowych/znajomych, co czyni ją administratorem danych w rozumieniu RODO, niezależnie od skali czy braku monetyzacji.

Ani `prd.md`, ani `roadmap.md`, ani `context/foundation/infrastructure.md` nie zawierają ani jednej wzmianki o GDPR, RODO, polityce prywatności, podstawie prawnej przetwarzania czy prawach osób, których dane dotyczą. Zero istnieje też w kodzie: brak funkcji usunięcia konta, eksportu danych, brak polityki prywatności, brak banera zgody na cookies (grep po `src/`, `context/` — brak trafień poza tym dokumentem).

Znaleziono też jedną **nowo odkrytą** niezgodność nieudokumentowaną nigdzie wcześniej: funkcje Vercel są świadomie skonfigurowane w regionie UE (`cdg1`/Paryż) dla europejskich użytkowników, ale baza danych Neon faktycznie używana przez projekt leży w `us-east-1` (AWS, Wirginia) — czyli dane osobowe fizycznie spoczywają poza EOG, mimo że warstwa obliczeniowa została celowo przeniesiona do UE dla innego powodu (latencja). To jest transfer danych do państwa trzeciego w rozumieniu RODO rozdz. V i nie jest nigdzie w projekcie świadomie zaadresowany.

## Detailed Findings

### 1. Zakres i charakter przetwarzanych danych osobowych

Encje potwierdzają, że aplikacja już (nie tylko w planach roadmapy) przechowuje dane osobowe wielu kategorii:

- `UserEntity` — email, `passwordHash`, `name` ([src/server/user/user.entity.ts](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/68766058a06fc690a63c440687b7f55abec51a0d/src/server/user/user.entity.ts#L10-L29)) — bezpośrednio identyfikujące dane kontaktowe i tożsamościowe.
- `FriendConnectionEntity` (`src/server/friend-connection/friend-connection.entity.ts`) — graf społeczny: kto z kim jest połączony, kto komu wysłał/zaakceptował zaproszenie.
- `BookEntity` (`src/server/book/book.entity.ts`) — własność/kolekcja przypisana do konkretnego użytkownika.
- `LoanEntity` (`src/server/loan/loan.entity.ts`) — dane behawioralne: kto od kogo i kiedy pożyczył książkę.

Żadna z tych danych nie jest danymi szczególnej kategorii (art. 9 RODO), ale to wciąż pełnoprawne dane osobowe w rozumieniu art. 4(1) — w tym profil behawioralny (historia wypożyczeń) i dane o relacjach społecznych, które RODO traktuje tak samo rygorystycznie jak dane kontaktowe.

Zauważona rozbieżność ze stanem roadmapy: `roadmap.md` oznacza S-01 do S-05 jako `status: proposed`/`blocked`, ale w repo faktycznie istnieją już trasy `login`, `register`, `(app)/friends`, `(app)/discover`, `(app)/requests`, `(app)/borrowing`, `(app)/collection` oraz wszystkie cztery encje — roadmap nie odzwierciedla realnego postępu implementacji, co jest istotne, bo oznacza, że przetwarzanie danych osobowych już trwa (przynajmniej lokalnie/w testach), a nie dopiero jest planowane.

### 2. Persona i geografia użytkowników wskazują na UE

- Persona PRD "Marta" jest jednoznacznie polska ([prd.md:27-31](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/68766058a06fc690a63c440687b7f55abec51a0d/context/foundation/prd.md#L27-L31)).
- Mockup projektowy jest po polsku, a roadmap wprost stwierdza, że i18n zostało "zaparkowane", nie dlatego że aplikacja nie jest dla Polaków, ale dlatego że angielski jest tymczasowym placeholderem ([roadmap.md:233](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/68766058a06fc690a63c440687b7f55abec51a0d/context/foundation/roadmap.md#L233)).
- `infrastructure.md` uzasadnia wybór regionu Vercel `cdg1` (Paryż) właśnie latencją dla polskich użytkowników — deweloper już podjął decyzję biznesową zakładającą realnych użytkowników w UE.

To wystarcza, by uznać RODO za mające zastosowanie terytorialne (art. 3) niezależnie od tego, gdzie formalnie siedzibę ma operator.

### 3. Region hostingu funkcji vs region bazy danych — nowo odkryta niezgodność

- `vercel.json` ustawia `"regions": ["cdg1"]` (Paryż) — funkcje serverless działają w UE ([vercel.json](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/68766058a06fc690a63c440687b7f55abec51a0d/vercel.json)).
- Rzeczywisty host bazy Neon w `.env.local` to `ep-small-cherry-ap64frgm...us-east-1.aws.neon.tech` — baza danych fizycznie leży w regionie AWS `us-east-1` (Wirginia, USA), **poza EOG**.
- `infrastructure.md`'s Risk Register wymienia ryzyko "EU region nie skonfigurowany" jako już zaadresowane przez dodanie `cdg1` do `vercel.json` ([infrastructure.md risk register](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/68766058a06fc690a63c440687b7f55abec51a0d/context/foundation/infrastructure.md)), ale nie wspomina ani razu, że sama baza danych — czyli miejsce faktycznego spoczywania danych osobowych — pozostaje w USA. To jest transfer danych osobowych poza EOG (RODO rozdz. V), wymagający odpowiedniego mechanizmu (np. Standard Contractual Clauses w umowie z Neon/AWS). Nic w repo nie wskazuje, że ta decyzja została świadomie podjęta lub że umowa DPA z Neon została sprawdzona.

### 4. Istniejące w projekcie ryzyka, które są de facto ryzykami RODO, ale nie są tak nazwane

`infrastructure.md`'s Risk Register już identyfikuje: "Preview URLs publicznie dostępne" (likelihood H, impact M) — publiczne, niezalogowane URL-e preview Vercel eksponują dane testowych użytkowników bez uwierzytelnienia. Zaproponowana mitygacja (włączenie Vercel Access) jest słuszna i wystarczająca, ale dokument nigdy nie łączy tego z ochroną danych osobowych/RODO — to ryzyko nieautoryzowanego dostępu do danych osobowych w rozumieniu art. 32 i potencjalny obowiązek zgłoszenia naruszenia (art. 33) gdyby się zmaterializowało na produkcji z prawdziwymi danymi.

### 5. Brak jakichkolwiek mechanizmów realizacji praw osób, których dane dotyczą

Przeszukano `src/` i `context/` pod kątem funkcji usunięcia konta, eksportu danych, polityki prywatności, zgody na cookies — zero trafień poza tym dokumentem badawczym. Konkretnie brakuje:

- **Usunięcie konta / danych** (art. 17 RODO, "prawo do bycia zapomnianym") — nie istnieje żadna akcja `deleteAccount` ani podobna w `src/app/**/actions.ts`.
- **Eksport / dostęp do danych** (art. 15, art. 20) — brak.
- **Informacja o przetwarzaniu / polityka prywatności** — brak jakiejkolwiek strony `/privacy` czy sekcji w PRD.
- **Retencja danych** — brak zdefiniowanej polityki (np. jak długo trzymać zamknięte pożyczki, odrzucone zaproszenia znajomych, usunięte książki).

Pozytywnie: hasła są hashowane przez `bcryptjs` (widoczne w `package.json` i `UserEntity.passwordHash`), co już spełnia część wymogu art. 32 (odpowiednie środki techniczne) — to nie jest luka.

### 6. Prywatność jako wymóg produktowy już istnieje w PRD (ale nie jako prawny)

`prd.md` §Guardrails i §Non-Goals już zawierają wymogi funkcjonalnie zbieżne z zasadami RODO, choć nie są tak ramowane:

- "A user's collection is visible only to confirmed friends — never publicly searchable or browsable by strangers" ([prd.md:43](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/68766058a06fc690a63c440687b7f55abec51a0d/context/foundation/prd.md#L43)) — spójne z zasadą minimalizacji/ograniczenia celu, ale sformułowane jako wymóg UX/prywatności produktowej, nie jako podstawa prawna przetwarzania.
- "No public profiles... never visible outside the confirmed friend circle" w §Non-Goals ([prd.md:135](https://github.com/TomekKasprzycki/domowa-biblioteka/blob/68766058a06fc690a63c440687b7f55abec51a0d/context/foundation/prd.md#L135)).

To dobry fundament projektowy, ale nie zastępuje formalnych wymogów: podstawy prawnej przetwarzania, informacji dla użytkownika, ani praw do usunięcia/eksportu danych.

## Code References

- `src/server/user/user.entity.ts:10-29` — pola osobowe: email, passwordHash, name
- `src/server/friend-connection/friend-connection.entity.ts` — graf społeczny
- `src/server/book/book.entity.ts` — dane własności/kolekcji
- `src/server/loan/loan.entity.ts` — dane behawioralne (historia wypożyczeń)
- `vercel.json` — region funkcji `cdg1` (Paryż, UE)
- `.env.local` (niecommitowany, tylko nazwy/hosty sprawdzone) — host bazy Neon w `us-east-1` (USA)
- `context/foundation/infrastructure.md` — decyzja o regionie UE dla funkcji, ryzyko publicznych preview URLs; brak wzmianki o regionie bazy danych i o RODO
- `context/foundation/prd.md:27-31` — persona polska
- `context/foundation/prd.md:43,135` — wymogi prywatności produktowej (nie prawnej)
- `context/foundation/roadmap.md:233` — i18n "zaparkowane", potwierdza polskojęzyczną grupę docelową

## Architecture Insights

- Projekt konsekwentnie traktuje prywatność jako wymóg **produktowy** (widoczność tylko dla znajomych) — nigdy jako wymóg **prawny/zgodności**. Te dwa nurty nie zostały dotąd połączone w żadnym dokumencie foundation.
- Decyzje infrastrukturalne (`infrastructure.md`) są podejmowane starannie z rejestrem ryzyk, ale rejestr skupia się na dostępności/latencji/kosztach — nigdy na klasyfikacji ryzyka pod kątem ochrony danych, mimo że governance materiału (Access control, region) bezpośrednio na to wpływa.
- Region bazy danych (Neon) nie jest w ogóle wzmiankowany w `infrastructure.md`, mimo że region funkcji Vercel jest — sugeruje to, że decyzja o regionie Neon nie była świadomie podjęta podczas researchu infrastruktury, tylko pozostała domyślną wartością z prowizjonowania.

## Historical Context (from prior changes)

- `context/changes/deployment/deployment_plan.md` prawdopodobnie dokumentuje faktyczne kroki wdrożenia na Vercel — nieprzeczytany w tym researchu (poza zakresem uzgodnionym z użytkownikiem: ocena + luki w PRD/roadmap, nie pełny audyt deploymentu). Warto sprawdzić przy ewentualnym follow-upie, czy krok provisioningu Neon pozwalał na wybór regionu UE.
- `context/design/servers.md` (nieśledzony w gicie) to nieaktualna eksploracja hostingu VPS (Hetzner, Niemcy/Finlandia) — zastąpiona przez faktyczną decyzję Vercel+Neon w `infrastructure.md`. Nie ma wpływu na obecny stan zgodności.

## Related Research

- Brak wcześniejszych artykułów badawczych dotyczących RODO/prywatności w `context/changes/**/research.md` ani `context/archive/**/research.md`.

## Gaps vs PRD/Roadmap — kandydaci do Open Questions

Poniższe nie są gotowymi wymaganiami (użytkownik wybrał zakres "ocena + luki", nie "pełne rekomendacje do roadmapy") — to lista konkretnych braków, gotowa do przeklejenia jako pozycje w `prd.md` §Open Questions lub `roadmap.md` §Open Roadmap Questions, do dalszej dyskusji i priorytetyzacji:

1. **Brak sekcji/wzmianki o podstawie prawnej przetwarzania i polityce prywatności** — `prd.md` nie ma sekcji Privacy/Legal. Aplikacja zbiera email, hasło, imię, dane o relacjach i zachowaniu, a nigdzie nie jest opisane, jaka jest podstawa prawna (zgoda? uzasadniony interes? wykonanie umowy?) ani czy użytkownik zobaczy informację o przetwarzaniu przy rejestracji.
2. **Brak funkcji usunięcia konta i danych (prawo do bycia zapomnianym)** — nie istnieje żadna trasa/akcja w `src/app` do usunięcia konta. Obecnie roadmap nie ma żadnego slice'a typu "account settings" — to nawet nie jest zaplanowane jako nieistniejące.
3. **Brak eksportu/dostępu do własnych danych** (art. 15/20 RODO) — niższy priorytet dla MVP, ale warto jako świadomy Open Question, nie milczące pominięcie.
4. **Region bazy danych Neon (`us-east-1`, USA) vs region funkcji (`cdg1`, Paryż)** — niezgodność nieudokumentowana nigdzie. Do decyzji: zaakceptować transfer do USA (i zweryfikować DPA/SCC z Neon) albo przenieść bazę do regionu UE Neon (np. `eu-central-1`), co dodatkowo poprawi spójność z już podjętą decyzją o regionie UE dla funkcji.
5. **Umowy powierzenia przetwarzania (DPA) z Vercel i Neon** — jako administrator danych, deweloper powinien mieć zaakceptowane DPA z każdym podmiotem przetwarzającym (Vercel, Neon). Nic w repo nie wskazuje, że zostało to sprawdzone.
6. **Połączenie istniejącego ryzyka "Preview URLs publicznie dostępne" z ochroną danych** — ryzyko już jest w `infrastructure.md`'s Risk Register z proponowaną mitygacją (Vercel Access); warto dopisać, że dotyczy to również ekspozycji danych osobowych, nie tylko ogólnego dostępu.
7. **Brak polityki retencji danych** — jak długo przechowywać zamknięte pożyczki, odrzucone zaproszenia, usunięte książki; obecnie nieokreślone.

## Open Questions

- Czy operator (deweloper) planuje traktować tę aplikację jako czysto prywatny projekt hobbystyczny dla wąskiego, zaufanego grona znajomych (co osłabia, ale nie eliminuje ryzyko regulacyjne), czy jako coś, co może się rozrosnąć poza to grono — co zmienia priorytet powyższych luk?
- Czy region bazy danych Neon (`us-east-1`) był świadomym wyborem podczas provisioningu, czy domyślną wartością? Wymaga sprawdzenia `context/changes/db-connection/` i `context/changes/deployment/deployment_plan.md`, co wykracza poza uzgodniony zakres tego researchu.
