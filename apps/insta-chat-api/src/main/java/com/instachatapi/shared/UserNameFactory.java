package com.instachatapi.shared;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

public final class UserNameFactory {

    private static final List<String> ANIMALS = List.of(
        "Lion",
        "Tiger",
        "Panther",
        "Wolf",
        "Fox",
        "Eagle",
        "Falcon",
        "Shark",
        "Whale",
        "Dolphin",
        "Bear",
        "Leopard",
        "Jaguar",
        "Cobra",
        "Viper",
        "Hawk",
        "Raven",
        "Otter",
        "Puma",
        "Bison",
        "Moose",
        "Rhino",
        "Cheetah",
        "Koala",
        "Lynx",
        "Buffalo",
        "Penguin",
        "Gorilla",
        "Octopus",
        "Chameleon"
    );

    private static final List<String> ADJECTIVES = List.of(
        "Brave",
        "Swift",
        "Fierce",
        "Mighty",
        "Silent",
        "Clever",
        "Wild",
        "Noble",
        "Rapid",
        "Shadow",
        "Golden",
        "Silver",
        "Crimson",
        "Stormy",
        "Thunder",
        "Blazing",
        "Frozen",
        "Hidden",
        "Flying",
        "Iron",
        "Dark",
        "Bright",
        "Savage",
        "Loyal",
        "Fearless",
        "Mystic",
        "Electric",
        "Royal",
        "Ancient",
        "Epic"
    );

    private UserNameFactory() {
        // Prevent instantiation
    }

    public static String generate() {
        ThreadLocalRandom random = ThreadLocalRandom.current();

        String adjective = ADJECTIVES.get(random.nextInt(ADJECTIVES.size()));
        String animal = ANIMALS.get(random.nextInt(ANIMALS.size()));

        return adjective + animal;
    }
}
