/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/app/borrow/actions", () => ({
  requestBorrowAction: jest.fn(),
}));

import { DiscoverSearch } from "@/app/discover/_components/discover-search";
import type { DiscoverBook, DiscoverFriend } from "@/app/discover/discover.types";

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

const books: DiscoverBook[] = [
  {
    id: "1",
    title: "Clean Code",
    author: "Robert Martin",
    notes: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    owner: alice,
    availability: availableToViewer,
  },
  {
    id: "2",
    title: "Refactoring",
    author: "Martin Fowler",
    notes: null,
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
      screen.getByText(/you have no confirmed friends yet/i)
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
    expect(screen.getByText("Clean Code")).toBeInTheDocument();
    expect(screen.getByText("Refactoring")).toBeInTheDocument();
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
      screen.getByLabelText(/search by title or author/i),
      "clean"
    );

    // then
    expect(screen.getByText("Clean Code")).toBeInTheDocument();
    expect(screen.queryByText("Refactoring")).not.toBeInTheDocument();
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
      screen.getByLabelText(/search by title or author/i),
      "fowler"
    );

    // then
    expect(screen.getByText("Refactoring")).toBeInTheDocument();
    expect(screen.queryByText("Clean Code")).not.toBeInTheDocument();
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
    await user.selectOptions(screen.getByLabelText(/filter by friend/i), bob.id);

    // then
    expect(screen.getByText("Refactoring")).toBeInTheDocument();
    expect(screen.queryByText("Clean Code")).not.toBeInTheDocument();
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
    const search = screen.getByLabelText(/search by title or author/i);

    // when
    await user.type(search, "clean");
    await user.clear(search);

    // then
    expect(screen.getByText("Clean Code")).toBeInTheDocument();
    expect(screen.getByText("Refactoring")).toBeInTheDocument();
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
    expect(screen.getByText("Clean Code")).toBeInTheDocument();
    expect(screen.queryByText("Refactoring")).not.toBeInTheDocument();
  });
});
