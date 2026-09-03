import {describe , it , expect } from 'vitest';
import {render , screen} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import Home from '@/app/[locale]/page';
import en from '@/messages/en.json';
import fr from '@/messages/fr.json';


function renderWithLocale(locale: string , messages: Record<string , unknown>) {
   // unknown plutôt que any : les deux acceptent n'importe quelle valeur, mais unknown
   //  t'oblige à vérifier le type avant de t'en servir, alors que any désactive toute vérification. 
   // Préférer unknown est un réflexe de code propre — et un point que les entretiens techniques relèvent

   return render(
        <NextIntlClientProvider locale={locale} messages={messages}>
            <Home />
        </NextIntlClientProvider>
   );
}

//describe / it : describe regroupe les tests d'un même sujet, 
// it décrit un comportement attendu en une phrase lisible. 
// Bien nommés, tes tests deviennent une documentation du comportement de l'app.

describe("Home page", () => {
  it("renders the main heading", () => {
    renderWithLocale("en", en);
    expect(
      screen.getByRole("heading", { level: 1, name: "Meta Ads Report Studio" })
    ).toBeInTheDocument();
  });

  it("renders the English call to action", () => {
    renderWithLocale("en", en);
    expect(
      screen.getByRole("button", { name: "Try the demo" })
    ).toBeInTheDocument();
  });

  it("renders the French call to action", () => {
    renderWithLocale("fr", fr);
    expect(
      screen.getByRole("button", { name: "Essayer la démo" })
    ).toBeInTheDocument();
  });
});