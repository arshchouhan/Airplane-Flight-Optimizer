# Distributed under the OSI-approved BSD 3-Clause License.  See accompanying
# file LICENSE.rst or https://cmake.org/licensing for details.

cmake_minimum_required(VERSION 4.1.0-rc4)

# Reject any attempt to use a toolchain file. We must not use one because
# we could be downloading it here. If the CMAKE_TOOLCHAIN_FILE environment
# variable is set, the cache variable will have been initialized from it.
unset(CMAKE_TOOLCHAIN_FILE CACHE)
unset(ENV{CMAKE_TOOLCHAIN_FILE})

# We name the project and the target for the ExternalProject_Add() call
# to something that will highlight to the user what we are working on if
# something goes wrong and an error message is produced.

project(nlohmann_json-populate NONE)



include(ExternalProject)
ExternalProject_Add(nlohmann_json-populate
                     "UPDATE_DISCONNECTED" "False" "EXTERNALPROJECT_INTERNAL_ARGUMENT_SEPARATOR" "URL" "https://github.com/nlohmann/json/releases/download/v3.11.2/json.hpp" DOWNLOAD_NO_EXTRACT YES
                    SOURCE_DIR          "E:/AIrplane Flight Optimizer/cpp/build/_deps/nlohmann_json-src"
                    BINARY_DIR          "E:/AIrplane Flight Optimizer/cpp/build/_deps/nlohmann_json-build"
                    CONFIGURE_COMMAND   ""
                    BUILD_COMMAND       ""
                    INSTALL_COMMAND     ""
                    TEST_COMMAND        ""
                    USES_TERMINAL_DOWNLOAD  YES
                    USES_TERMINAL_UPDATE    YES
                    USES_TERMINAL_PATCH     YES
)


ExternalProject_Get_Property(nlohmann_json-populate DOWNLOADED_FILE)
get_filename_component(dlFileName "${DOWNLOADED_FILE}" NAME)

ExternalProject_Add_Step(nlohmann_json-populate copyfile
  COMMAND    "C:/Program Files/CMake/bin/cmake.exe" -E copy_if_different
             "<DOWNLOADED_FILE>" "E:/AIrplane Flight Optimizer/cpp/build/_deps/nlohmann_json-src"
  DEPENDEES  patch
  DEPENDERS  configure
  BYPRODUCTS "E:/AIrplane Flight Optimizer/cpp/build/_deps/nlohmann_json-src/${dlFileName}"
  COMMENT    "Copying file to SOURCE_DIR"
)

