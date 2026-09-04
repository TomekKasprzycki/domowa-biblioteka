/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/app/borrow/actions", () => ({
  requestBorrowAction: jest.fn(),
}));

import { DiscoverSearch } from "@/app/(app)/discover/_components/discover-search";
import type { DiscoverBook, DiscoverFriend } from "@/app/(app)/discover/discover.types";

const alice: DiscoverFriend = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  name: "Alice",
  email: "alice@example.com",
};
const bob: DiscoverFriend = {
  id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  name: "Bob",
  email: "bob@example.com",
};

const availableToViewer = {
  status: "available" as const,
  borrowedByViewer: false,
  requestedByViewer: false,
};

function spineFor(title: string) {
  return new RegExp(`^Zobacz: ${title},`);
}

const books: DiscoverBook[] = [
  {
    id: "1",
    title: "Clean Code",
    author: "Robert Martin",
    notes: null,
    isbn: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    owner: alice,
    availability: availableToViewer,
  },
  {
    id: "2",
    title: "Refactoring",
    author: "Martin Fowler",
    notes: null,
    isbn: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    owner: bob,
    availability: availableToViewer,
  },
];

describe("DiscoverSearch", () => {
  it("shows an empty state when the user has no confirmed friends", () => {
    // given
    render(
      <DiscoverSearch books={[]} friends={[]} initialFriendId={null} />
    );

    // when / then
    expect(
      screen.getByText(/nie masz jeszcze potwierdzonych znajomych/i)
    ).toBeInTheDocument();
  });

  it("renders every friend's book by default", () => {
    // given
    render(
      <DiscoverSearch
        books={books}
        friends={[alice, bob]}
        initialFriendId={null}
      />
    );

    // when / then
    expect(screen.getByRole("button", { name: spineFor("Clean Code") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: spineFor("Refactoring") })).toBeInTheDocument();
  });

  it("exposes the shelf as a list with one item per matching book", () => {
    // given / when
    render(
      <DiscoverSearch
        books={books}
        friends={[alice, bob]}
        initialFriendId={null}
      />
    );

    // then
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("filters by title as the user types", async () => {
    // given
    const user = userEvent.setup();
    render(
      <DiscoverSearch
        books={books}
        friends={[alice, bob]}
        initialFriendId={null}
      />
    );

    // when
    await user.type(
      screen.getByLabelText(/szukaj po tytule lub autorze/i),
      "clean"
    );

    // then
    expect(screen.getByRole("button", { name: spineFor("Clean Code") })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: spineFor("Refactoring") })
    ).not.toBeInTheDocument();
  });

  it("filters by author as the user types", async () => {
    // given
    const user = userEvent.setup();
    render(
      <DiscoverSearch
        books={books}
        friends={[alice, bob]}
        initialFriendId={null}
      />
    );

    // when
    await user.type(
      screen.getByLabelText(/szukaj po tytule lub autorze/i),
      "fowler"
    );

    // then
    expect(screen.getByRole("button", { name: spineFor("Refactoring") })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: spineFor("Clean Code") })
    ).not.toBeInTheDocument();
  });

  it("narrows to a single friend when one is selected", async () => {
    // given
    const user = userEvent.setup();
    render(
      <DiscoverSearch
        books={books}
        friends={[alice, bob]}
        initialFriendId={null}
      />
    );

    // when
    await user.selectOptions(screen.getByLabelText(/filtruj według znajomego/i), bob.id);

    // then
    expect(screen.getByRole("button", { name: spineFor("Refactoring") })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: spineFor("Clean Code") })
    ).not.toBeInTheDocument();
  });

  it("restores the full list when search and filter are cleared", async () => {
    // given
    const user = userEvent.setup();
    render(
      <DiscoverSearch
        books={books}
        friends={[alice, bob]}
        initialFriendId={null}
      />
    );
    const search = screen.getByLabelText(/szukaj po tytule lub autorze/i);

    // when
    await user.type(search, "clean");
    await user.clear(search);

    // then
    expect(screen.getByRole("button", { name: spineFor("Clean Code") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: spineFor("Refactoring") })).toBeInTheDocument();
  });

  it("pre-scopes to the initial friend id when supplied", () => {
    // given
    render(
      <DiscoverSearch
        books={books}
        friends={[alice, bob]}
        initialFriendId={alice.id}
      />
    );

    // when / then
    expect(screen.getByRole("button", { name: spineFor("Clean Code") })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: spineFor("Refactoring") })
    ).not.toBeInTheDocument();
  });
});
